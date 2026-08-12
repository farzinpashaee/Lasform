package com.csl.lasform.auth.application;

import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.csl.lasform.auth.domain.model.Permission;
import com.csl.lasform.auth.domain.model.RolePermission;
import com.csl.lasform.auth.domain.model.UserRole;
import com.csl.lasform.auth.domain.repository.PermissionRepository;
import com.csl.lasform.auth.domain.repository.RolePermissionRepository;
import com.csl.lasform.auth.domain.repository.RoleRepository;
import com.csl.lasform.auth.domain.repository.UserRoleRepository;

import lombok.RequiredArgsConstructor;

/** Flattens a user's (or a role's) assigned permissions into the plain key set enforced by {@code hasAuthority(...)}. */
@Component
@RequiredArgsConstructor
public class PermissionResolutionService {

    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final PermissionRepository permissionRepository;

    public Set<String> resolveForUser(String userId) {
        Set<String> roleIds =
                userRoleRepository.findByUserId(userId).stream().map(UserRole::getRoleId).collect(Collectors.toSet());
        return resolveForRoleIds(roleIds);
    }

    /** Used once at startup to seed the security filter chain's anonymous authorities from the ANONYMOUS role. */
    public Set<String> resolveForRoleName(String roleName) {
        return roleRepository.findByName(roleName)
                .map(role -> resolveForRoleIds(Set.of(role.getId())))
                .orElseGet(Set::of);
    }

    private Set<String> resolveForRoleIds(Set<String> roleIds) {
        if (roleIds.isEmpty()) {
            return Set.of();
        }
        Set<String> permissionIds = roleIds.stream()
                .flatMap(roleId -> rolePermissionRepository.findByRoleId(roleId).stream())
                .map(RolePermission::getPermissionId)
                .collect(Collectors.toSet());
        if (permissionIds.isEmpty()) {
            return Set.of();
        }
        return permissionRepository.findByIdIn(permissionIds).stream()
                .map(Permission::getKey)
                .collect(Collectors.toSet());
    }
}
