package com.csl.lasform.auth.application.seed;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.csl.lasform.auth.domain.model.Organization;
import com.csl.lasform.auth.domain.model.Permission;
import com.csl.lasform.auth.domain.model.PermissionKey;
import com.csl.lasform.auth.domain.model.Role;
import com.csl.lasform.auth.domain.model.RolePermission;
import com.csl.lasform.auth.domain.model.SystemRoleName;
import com.csl.lasform.auth.domain.model.User;
import com.csl.lasform.auth.domain.model.UserRole;
import com.csl.lasform.auth.domain.model.UserStatus;
import com.csl.lasform.auth.domain.repository.OrganizationRepository;
import com.csl.lasform.auth.domain.repository.PermissionRepository;
import com.csl.lasform.auth.domain.repository.RolePermissionRepository;
import com.csl.lasform.auth.domain.repository.RoleRepository;
import com.csl.lasform.auth.domain.repository.UserRepository;
import com.csl.lasform.auth.domain.repository.UserRoleRepository;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Bootstraps auth data on every application startup:
 *
 * <ol>
 *   <li>The fixed {@link PermissionKey} catalog and the 5 system roles + their permission bundles
 *       are (re)synced idempotently every run — safe to leave enabled permanently.
 *   <li>The single {@link Organization} and the initial SUPER_ADMIN {@link User} are created once,
 *       only if none exist yet ("first run").
 * </ol>
 *
 * Runs from {@code @PostConstruct}, not {@code ApplicationRunner} — {@code SecurityConfig}
 * resolves the ANONYMOUS role's permissions into the anonymous-authentication authorities while
 * building the {@code SecurityFilterChain} bean, which happens during context refresh, before any
 * {@code ApplicationRunner} would fire. {@code @PostConstruct} runs early enough to have seeded
 * that role first, as long as {@code SecurityConfig} depends on this bean (see its
 * {@code @DependsOn("authSeeder")}).
 *
 * <p>Gated by {@code lasform.seed.enabled} (default {@code true}) so it can be turned off — e.g.
 * for a read replica or a test profile that shouldn't write on boot.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AuthSeeder {

    private static final Map<SystemRoleName, List<PermissionKey>> SYSTEM_ROLE_PERMISSIONS = buildRolePermissions();

    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${lasform.seed.enabled:true}")
    private boolean seedEnabled;

    @Value("${lasform.org.name:Lasform}")
    private String orgName;

    /** Deliberately no default — never hardcode credentials. Must come from LASFORM_ADMIN_EMAIL. */
    @Value("${lasform.admin.email:}")
    private String adminEmail;

    /** Deliberately no default — never hardcode credentials. Must come from LASFORM_ADMIN_PASSWORD. */
    @Value("${lasform.admin.password:}")
    private String adminPassword;

    @PostConstruct
    void seed() {
        if (!seedEnabled) {
            log.info("lasform.seed.enabled=false — skipping auth data seeding.");
            return;
        }

        Map<PermissionKey, Permission> permissions = seedPermissions();
        Map<SystemRoleName, Role> roles = seedSystemRoles(permissions);
        Organization organization = seedOrganization();
        seedSuperAdmin(organization, roles.get(SystemRoleName.SUPER_ADMIN));
    }

    /** Inserts any {@link PermissionKey} not yet present; never removes or renames existing ones. */
    private Map<PermissionKey, Permission> seedPermissions() {
        Map<PermissionKey, Permission> byKey = new EnumMap<>(PermissionKey.class);
        for (PermissionKey key : PermissionKey.values()) {
            Permission permission = permissionRepository.findByKey(key.key()).orElseGet(() -> {
                Permission created = permissionRepository.save(
                        Permission.builder().key(key.key()).description(key.description()).build());
                log.info("Seeded permission '{}'", key.key());
                return created;
            });
            byKey.put(key, permission);
        }
        return byKey;
    }

    /** Creates any missing system role and (re-)grants its full bundle; never revokes a permission that was removed from a bundle. */
    private Map<SystemRoleName, Role> seedSystemRoles(Map<PermissionKey, Permission> permissions) {
        Map<SystemRoleName, Role> byName = new EnumMap<>(SystemRoleName.class);
        for (SystemRoleName roleName : SystemRoleName.values()) {
            Role role = roleRepository.findByName(roleName.name()).orElseGet(() -> {
                Role created = roleRepository.save(Role.builder().name(roleName.name()).isSystemRole(true).build());
                log.info("Seeded system role '{}'", roleName.name());
                return created;
            });
            byName.put(roleName, role);

            for (PermissionKey permissionKey : SYSTEM_ROLE_PERMISSIONS.get(roleName)) {
                rolePermissionRepository.save(RolePermission.builder()
                        .roleId(role.getId())
                        .permissionId(permissions.get(permissionKey).getId())
                        .build());
            }
        }
        return byName;
    }

    /** No-op if an organization already exists — multi-tenant creation isn't supported yet. */
    private Organization seedOrganization() {
        List<Organization> existing = organizationRepository.findAll();
        if (!existing.isEmpty()) {
            return existing.get(0);
        }
        Organization created = organizationRepository.save(Organization.builder().name(orgName).build());
        log.info("Seeded organization '{}' ({})", created.getName(), created.getId());
        return created;
    }

    /** Only runs while no users exist at all — later restarts are a no-op even if the env vars are still set. */
    private void seedSuperAdmin(Organization organization, Role superAdminRole) {
        if (!userRepository.findAll().isEmpty()) {
            return;
        }
        if (!StringUtils.hasText(adminEmail) || !StringUtils.hasText(adminPassword)) {
            log.warn(
                    "No users exist yet and LASFORM_ADMIN_EMAIL/LASFORM_ADMIN_PASSWORD are not set — "
                            + "skipping initial SUPER_ADMIN creation. Set both environment variables and "
                            + "restart to create the initial admin account.");
            return;
        }

        User admin = userRepository.save(User.builder()
                .orgId(organization.getId())
                .email(adminEmail)
                .passwordHash(passwordEncoder.encode(adminPassword))
                .status(UserStatus.ACTIVE)
                .mustResetPassword(true)
                .build());

        userRoleRepository.save(UserRole.builder()
                .userId(admin.getId())
                .roleId(superAdminRole.getId())
                .orgId(organization.getId())
                .build());

        log.info("Seeded initial SUPER_ADMIN user '{}'", admin.getEmail());
    }

    private static Map<SystemRoleName, List<PermissionKey>> buildRolePermissions() {
        Map<SystemRoleName, List<PermissionKey>> map = new EnumMap<>(SystemRoleName.class);
        List<PermissionKey> all = List.of(PermissionKey.values());

        map.put(SystemRoleName.SUPER_ADMIN, all);
        // No org/system-level-only permissions are defined yet (single org, no cross-org admin
        // surface) — ADMIN gets everything SUPER_ADMIN does until that distinction exists.
        map.put(SystemRoleName.ADMIN, all);
        map.put(
                SystemRoleName.OPERATOR,
                List.of(
                        PermissionKey.DEVICE_READ, PermissionKey.DEVICE_WRITE, PermissionKey.DEVICE_DELETE,
                        PermissionKey.LOCATION_READ, PermissionKey.LOCATION_WRITE, PermissionKey.LOCATION_DELETE,
                        PermissionKey.GEOFENCE_READ, PermissionKey.GEOFENCE_WRITE, PermissionKey.GEOFENCE_DELETE,
                        PermissionKey.EVENT_READ));
        map.put(
                SystemRoleName.VIEWER,
                List.of(
                        PermissionKey.DEVICE_READ, PermissionKey.LOCATION_READ, PermissionKey.GEOFENCE_READ,
                        PermissionKey.EVENT_READ));
        map.put(SystemRoleName.ANONYMOUS, List.of(PermissionKey.MAP_VIEW_PUBLIC));

        return map;
    }
}
