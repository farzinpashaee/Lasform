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
import com.csl.lasform.exception.BadRequestException;

import lombok.RequiredArgsConstructor;

/**
 * Backs the frontend's first-run setup wizard ({@code /setup}) — the UI path to creating the
 * initial SUPER_ADMIN when the env-var bootstrap ({@code AuthSeeder#seedSuperAdmin}) wasn't used.
 * Both paths share the same underlying invariant ("only while zero users exist"); this is just a
 * second, interactive way to satisfy it.
 */
@Component
@RequiredArgsConstructor
public class SetupService {

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationService authenticationService;

    /** Same check {@code AuthSeeder.seedSuperAdmin} uses — true only until the very first user is created. */
    public boolean needsSetup() {
        return userRepository.findAll().isEmpty();
    }

    /**
     * Creates the initial SUPER_ADMIN and logs them in, same as {@code POST /api/auth/login} would
     * right after. {@code mustResetPassword} is false — unlike the env-var/admin-invited paths, this
     * password was chosen by the admin themselves, so there's nothing stale to force a reset on.
     *
     * <p>The "zero users" check and this method's save aren't wrapped in a transaction, so two
     * concurrent calls could both pass the check and each create a SUPER_ADMIN. Accepted: no
     * elevated access is granted incorrectly either way, and this is a one-time bootstrap endpoint
     * only reachable while the install has no users at all.
     */
    public LoginResult createInitialSuperAdmin(String displayName, String email, String rawPassword) {
        if (!needsSetup()) {
            throw new BadRequestException("error.setup.alreadyCompleted");
        }

        Organization organization = organizationRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No organization has been seeded yet."));
        Role superAdminRole = roleRepository
                .findByName(SystemRoleName.SUPER_ADMIN.name())
                .orElseThrow(() -> new IllegalStateException("SUPER_ADMIN role has not been seeded yet."));

        User admin = userRepository.save(User.builder()
                .orgId(organization.getId())
                .email(email)
                .displayName(displayName)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .status(UserStatus.ACTIVE)
                .mustResetPassword(false)
                .build());

        userRoleRepository.save(UserRole.builder()
                .userId(admin.getId())
                .roleId(superAdminRole.getId())
                .orgId(organization.getId())
                .build());

        // Reuses the exact login path (password check, permission resolution, token issuance)
        // rather than duplicating AuthenticationService#issueTokens.
        return authenticationService.login(email, rawPassword);
    }
}
