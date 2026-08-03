package com.csl.lasform.service.impl;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.FileSystemUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import com.csl.lasform.config.ImageStorageProperties;
import com.csl.lasform.exception.DuplicateResourceException;
import com.csl.lasform.exception.ResourceNotFoundException;
import com.csl.lasform.service.ImageStorageService;

/**
 * Stores images under {@code basePath/ownerId/filename} on the local filesystem. All owner ids
 * and filenames are validated to resolve inside their expected parent directory before any I/O,
 * since both ultimately come from client input (path variables / upload metadata).
 */
@Service
public class FileSystemImageStorageService implements ImageStorageService {

    private final Path basePath;

    public FileSystemImageStorageService(ImageStorageProperties properties) {
        this.basePath = Paths.get(properties.getBasePath()).toAbsolutePath().normalize();
    }

    @Override
    public String store(String ownerId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File must not be empty");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("File must be an image, got content type: " + contentType);
        }

        Path ownerDir = resolveOwnerDir(ownerId);
        String filename = sanitizeFilename(file.getOriginalFilename());
        Path target = resolveFile(ownerDir, filename);

        if (Files.exists(target)) {
            throw new DuplicateResourceException("An image named '" + filename + "' already exists");
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
            throw new ResourceNotFoundException("Image not found: " + filename);
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
            throw new IllegalArgumentException("Owner id must not be blank");
        }
        Path resolved = basePath.resolve(ownerId).normalize();
        if (!resolved.startsWith(basePath) || resolved.equals(basePath)) {
            throw new IllegalArgumentException("Invalid owner id: " + ownerId);
        }
        return resolved;
    }

    private Path resolveFile(Path ownerDir, String filename) {
        Path resolved = ownerDir.resolve(filename).normalize();
        if (!resolved.startsWith(ownerDir) || resolved.equals(ownerDir)) {
            throw new IllegalArgumentException("Invalid filename: " + filename);
        }
        return resolved;
    }

    /** Strips any directory components and rejects blank/traversal-only names, so only a bare filename survives. */
    private String sanitizeFilename(String rawFilename) {
        if (rawFilename == null) {
            throw new IllegalArgumentException("Filename must not be blank");
        }
        Path cleaned = Paths.get(StringUtils.cleanPath(rawFilename)).getFileName();
        String filename = cleaned == null ? null : cleaned.toString();
        if (!StringUtils.hasText(filename) || filename.equals(".") || filename.equals("..")) {
            throw new IllegalArgumentException("Invalid filename: " + rawFilename);
        }
        return filename;
    }
}
