package com.csl.lasform.auth.application;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Base64;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.imageio.ImageIO;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.csl.lasform.auth.domain.model.Organization;
import com.csl.lasform.auth.domain.model.Role;
import com.csl.lasform.auth.domain.model.SystemRoleName;
import com.csl.lasform.auth.domain.model.User;
import com.csl.lasform.auth.domain.model.UserRole;
import com.csl.lasform.auth.domain.model.UserStatus;
import com.csl.lasform.auth.domain.repository.OrganizationRepository;
import com.csl.lasform.auth.domain.repository.RoleRepository;
import com.csl.lasform.auth.domain.repository.UserRepository;
import com.csl.lasform.auth.domain.repository.UserRoleRepository;
import com.csl.lasform.exception.BadRequestException;
import com.csl.lasform.exception.DuplicateResourceException;
import com.csl.lasform.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class UserManagementService {

    /** Matches a `data:image/<type>;base64,<payload>` URL, capturing the base64 payload. */
    private static final Pattern AVATAR_DATA_URL =
            Pattern.compile("^data:image/(?:png|jpe?g|gif|webp);base64,([A-Za-z0-9+/]+={0,2})$");

    private static final int MAX_AVATAR_DIMENSION_PX = 512;
    private static final long MAX_AVATAR_SIZE_BYTES = 1024 * 1024;

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final OrganizationRepository organizationRepository;
    private final PasswordEncoder passwordEncoder;

    /** {@code mustResetPassword} defaults to true (see {@link User}) — the admin-supplied password is temporary by design. */
    public User createUser(String orgId, String email, String temporaryPassword) {
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("error.user.duplicateEmail", email);
        }
        return userRepository.save(User.builder()
                .orgId(orgId)
                .email(email)
                .passwordHash(passwordEncoder.encode(temporaryPassword))
                .status(UserStatus.ACTIVE)
                .mustResetPassword(true)
                .build());
    }

    /**
     * Public self-registration (no admin involved): the account is created {@code DISABLED} and
     * only granted {@code VIEWER}, so a newly signed-up user can't log in or see anything beyond
     * the anonymous public map until an admin reviews and activates them. {@code mustResetPassword}
     * is false since the user chose this password themselves — there's nothing to force-reset.
     */
    public User signUp(String fullName, String email, String rawPassword) {
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("error.user.duplicateEmail", email);
        }
        return createPendingUser(fullName, email, passwordEncoder.encode(rawPassword), null);
    }

    /**
     * Same pending-approval outcome as {@link #signUp}, but for a user authenticating via Google
     * for the first time — see AuthenticationService#googleAuth, which is the only caller and has
     * already confirmed no account exists for this email. There's no local password (Google is the
     * only way in until an admin activates the account and the user sets one via reset-password).
     */
    public User signUpViaGoogle(String fullName, String email, String avatarUrl) {
        return createPendingUser(fullName, email, null, avatarUrl);
    }

    private User createPendingUser(String fullName, String email, String passwordHash, String avatarUrl) {
        String orgId = organizationRepository.findAll().stream()
                .findFirst()
                .map(Organization::getId)
                .orElseThrow(() -> new IllegalStateException("No organization has been seeded yet."));

        User created = userRepository.save(User.builder()
                .orgId(orgId)
                .email(email)
                .displayName(fullName)
                .avatarUrl(avatarUrl)
                .passwordHash(passwordHash)
                .status(UserStatus.DISABLED)
                .mustResetPassword(false)
                .build());

        Role viewerRole = roleRepository
                .findByName(SystemRoleName.VIEWER.name())
                .orElseThrow(() -> new IllegalStateException("VIEWER role has not been seeded yet."));
        userRoleRepository.save(UserRole.builder().userId(created.getId()).roleId(viewerRole.getId()).orgId(orgId).build());

        return created;
    }

    /** Additive — grants the role alongside whatever the user already has, idempotently (see UserRoleRepository.save). */
    public void assignRole(String userId, String roleId, String orgId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("error.user.notFound", userId);
        }
        if (!roleRepository.existsById(roleId)) {
            throw new ResourceNotFoundException("error.role.notFound", roleId);
        }
        userRoleRepository.save(UserRole.builder().userId(userId).roleId(roleId).orgId(orgId).build());
    }

    /** Idempotent — removing a role the user doesn't have is a no-op (see UserRoleRepository.deleteByUserIdAndRoleIdAndOrgId). */
    public void removeRole(String userId, String roleId, String orgId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("error.user.notFound", userId);
        }
        if (!roleRepository.existsById(roleId)) {
            throw new ResourceNotFoundException("error.role.notFound", roleId);
        }
        userRoleRepository.deleteByUserIdAndRoleIdAndOrgId(userId, roleId, orgId);
    }

    /** Self-service only — a user setting their own displayName, not an admin editing someone else's. */
    public User updateOwnProfile(String userId, String displayName) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("error.user.notFound", userId));
        user.setDisplayName(displayName);
        return userRepository.save(user);
    }

    /**
     * Self-service only. {@code avatarImage} is a client-supplied data URL — never trust its
     * claimed size or format, so this re-derives both from the decoded bytes before accepting it.
     * A validated custom avatar takes priority over {@link User#getAvatarUrl()} (Google's photo)
     * everywhere it's rendered — see AuthenticationService's JWT claims.
     */
    public User updateOwnAvatar(String userId, String avatarImage) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("error.user.notFound", userId));
        user.setCustomAvatarImage(validateAvatarImage(avatarImage));
        return userRepository.save(user);
    }

    /** Self-service only — reverts display back to the Google photo (if any) or the letter avatar. */
    public User removeOwnAvatar(String userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("error.user.notFound", userId));
        user.setCustomAvatarImage(null);
        return userRepository.save(user);
    }

    private static String validateAvatarImage(String avatarImage) {
        Matcher matcher = AVATAR_DATA_URL.matcher(avatarImage);
        if (!matcher.matches()) {
            throw new BadRequestException("error.user.avatar.invalidFormat");
        }

        byte[] decoded;
        try {
            decoded = Base64.getDecoder().decode(matcher.group(1));
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("error.user.avatar.invalidFormat");
        }
        if (decoded.length > MAX_AVATAR_SIZE_BYTES) {
            throw new BadRequestException("error.user.avatar.tooLarge", MAX_AVATAR_SIZE_BYTES / (1024 * 1024));
        }

        BufferedImage decodedImage;
        try {
            decodedImage = ImageIO.read(new ByteArrayInputStream(decoded));
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read uploaded avatar image", e);
        }
        if (decodedImage == null) {
            throw new BadRequestException("error.user.avatar.corruptOrUnsupported");
        }
        if (decodedImage.getWidth() > MAX_AVATAR_DIMENSION_PX || decodedImage.getHeight() > MAX_AVATAR_DIMENSION_PX) {
            throw new BadRequestException("error.user.avatar.dimensionsTooLarge", MAX_AVATAR_DIMENSION_PX);
        }

        return avatarImage;
    }

    /**
     * Admin editing another user's profile info and status. {@code callerId} guards against an
     * admin disabling their own account through this endpoint (same "never act on yourself via the
     * broader-permission path" rule as ReviewService#deleteOthers) — self-service password/profile
     * changes go through updateOwnProfile/resetPassword instead, disabling isn't self-service at all.
     */
    public User updateUser(String userId, String callerId, String displayName, UserStatus status) {
        if (userId.equals(callerId) && status == UserStatus.DISABLED) {
            throw new BadRequestException("error.user.cannotDisableSelf");
        }
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("error.user.notFound", userId));
        user.setDisplayName(displayName);
        user.setStatus(status);
        return userRepository.save(user);
    }
}
