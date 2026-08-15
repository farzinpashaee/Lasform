package com.csl.lasform.auth.application;

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
import com.csl.lasform.exception.DuplicateResourceException;
import com.csl.lasform.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class UserManagementService {

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

    /** Self-service only — a user setting their own displayName, not an admin editing someone else's. */
    public User updateOwnProfile(String userId, String displayName) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("error.user.notFound", userId));
        user.setDisplayName(displayName);
        return userRepository.save(user);
    }
}
