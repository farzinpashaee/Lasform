package com.csl.lasform.auth.application;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.csl.lasform.auth.domain.model.User;
import com.csl.lasform.auth.domain.model.UserRole;
import com.csl.lasform.auth.domain.model.UserStatus;
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
