package com.csl.lasform.service.impl;

import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import javax.imageio.ImageIO;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.FileSystemUtils;
import org.springframework.util.StringUtils;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MultipartFile;

import com.csl.lasform.exception.BadRequestException;
import com.csl.lasform.exception.DuplicateResourceException;
import com.csl.lasform.exception.ResourceNotFoundException;
import com.csl.lasform.service.ImageStorageService;
import com.csl.lasform.service.ImageStorageSettingsService;

/**
 * Stores images under {@code basePath/ownerId/filename} on the local filesystem. All owner ids
 * and filenames are validated to resolve inside their expected parent directory before any I/O,
 * since both ultimately come from client input (path variables / upload metadata). {@code
 * basePath}/allowed extensions/max size are all resolved fresh from {@link
 * ImageStorageSettingsService} on every call rather than cached, so an admin edit on the General
 * Settings page applies to the very next upload — no restart.
 */
@Service
public class FileSystemImageStorageService implements ImageStorageService {

    /** Guards against decompression-bomb style uploads (a tiny file that decodes to a huge bitmap). */
    private static final int MAX_DIMENSION_PX = 8000;

    private final ImageStorageSettingsService settings;

    public FileSystemImageStorageService(ImageStorageSettingsService settings) {
        this.settings = settings;
    }

    @Override
    public String store(String ownerId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("error.image.uploadRequired");
        }
        Set<String> allowedExtensions = settings.allowedExtensions();
        String extension = extractExtension(file.getOriginalFilename());
        if (extension == null || !allowedExtensions.contains(extension)) {
            throw new BadRequestException("error.image.invalidExtension", String.join(", ", allowedExtensions));
        }
        DataSize maxFileSize = settings.maxFileSize();
        if (file.getSize() > maxFileSize.toBytes()) {
            throw new BadRequestException("error.image.tooLarge", maxFileSize.toMegabytes());
        }
        // The extension above only tells us what the client claims the file is — this decodes
        // the actual bytes so a renamed/relabeled non-image file can't get past it.
        validateActualImageContent(file);

        Path ownerDir = resolveOwnerDir(ownerId);
        // Server-generated rather than derived from the client's original filename: two different
        // photos both named "IMG_0001.jpg" (the norm for phone camera output) would otherwise
        // collide on the second upload, and a partial failure after this point (e.g. the entity
        // save in EntityImageService) would permanently jam every future upload of that same name.
        String filename = generateFilename(extension);
        Path target = resolveFile(ownerDir, filename);

        if (Files.exists(target)) {
            throw new DuplicateResourceException("error.image.alreadyExists", filename);
        }
        try {
            Files.createDirectories(ownerDir);
            file.transferTo(target);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to store image '" + filename + "'", e);
        }
        return filename;
    }

    @Override
    public Resource load(String ownerId, String filename) {
        Path target = resolveFile(resolveOwnerDir(ownerId), sanitizeFilename(filename));
        if (!Files.isRegularFile(target)) {
            throw new ResourceNotFoundException("error.image.notFound", filename);
        }
        try {
            return new UrlResource(target.toUri());
        } catch (MalformedURLException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public void delete(String ownerId, String filename) {
        Path target = resolveFile(resolveOwnerDir(ownerId), sanitizeFilename(filename));
        try {
            Files.deleteIfExists(target);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to delete image '" + filename + "'", e);
        }
    }

    @Override
    public void deleteAll(String ownerId) {
        Path ownerDir = resolveOwnerDir(ownerId);
        if (Files.exists(ownerDir)) {
            try {
                FileSystemUtils.deleteRecursively(ownerDir);
            } catch (IOException e) {
                throw new UncheckedIOException("Failed to delete images for owner '" + ownerId + "'", e);
            }
        }
    }

    /** {@code ownerId} is client-supplied (a path variable), so it gets the same traversal guard as filenames. */
    private Path resolveOwnerDir(String ownerId) {
        if (ownerId == null || ownerId.isBlank()) {
            throw new BadRequestException("error.image.ownerIdRequired");
        }
        Path basePath = settings.basePath();
        Path resolved = basePath.resolve(ownerId).normalize();
        if (!resolved.startsWith(basePath) || resolved.equals(basePath)) {
            throw new BadRequestException("error.image.invalidOwnerId", ownerId);
        }
        return resolved;
    }

    private Path resolveFile(Path ownerDir, String filename) {
        Path resolved = ownerDir.resolve(filename).normalize();
        if (!resolved.startsWith(ownerDir) || resolved.equals(ownerDir)) {
            throw new BadRequestException("error.image.invalidFilename", filename);
        }
        return resolved;
    }

    /** Strips any directory components and rejects blank/traversal-only names, so only a bare filename survives. */
    private String sanitizeFilename(String rawFilename) {
        if (rawFilename == null) {
            throw new BadRequestException("error.image.filenameRequired");
        }
        Path cleaned = Paths.get(StringUtils.cleanPath(rawFilename)).getFileName();
        String filename = cleaned == null ? null : cleaned.toString();
        if (!StringUtils.hasText(filename) || filename.equals(".") || filename.equals("..")) {
            throw new BadRequestException("error.image.invalidFilename", rawFilename);
        }
        return filename;
    }

    /** @return the lower-cased extension (no dot), or {@code null} if there isn't one. */
    private static String extractExtension(String rawFilename) {
        if (rawFilename == null) {
            return null;
        }
        String name = StringUtils.cleanPath(rawFilename);
        int dot = name.lastIndexOf('.');
        if (dot < 0 || dot == name.length() - 1) {
            return null;
        }
        return name.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private static String generateFilename(String extension) {
        return UUID.randomUUID() + "." + extension;
    }

    private static void validateActualImageContent(MultipartFile file) {
        BufferedImage decoded;
        try (InputStream in = file.getInputStream()) {
            decoded = ImageIO.read(in);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read uploaded image", e);
        }
        if (decoded == null) {
            throw new BadRequestException("error.image.corruptOrUnsupported");
        }
        if (decoded.getWidth() > MAX_DIMENSION_PX || decoded.getHeight() > MAX_DIMENSION_PX) {
            throw new BadRequestException("error.image.dimensionsTooLarge", MAX_DIMENSION_PX);
        }
    }
}
