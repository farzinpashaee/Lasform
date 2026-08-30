package com.csl.lasform.auth.domain.repository;

import java.util.List;

import com.csl.lasform.auth.domain.model.RolePermission;

/**
 * Identified by its (roleId, permissionId) pair rather than a synthetic id, so this port is
 * shaped around that natural key instead of extending {@link Repository}.
 */
public interface RolePermissionRepository {

    /** Idempotent: granting a permission a role already has is a no-op, not a duplicate. */
    RolePermission save(RolePermission rolePermission);

    List<RolePermission> findByRoleId(String roleId);

    List<RolePermission> findByPermissionId(String permissionId);

    void deleteByRoleIdAndPermissionId(String roleId, String permissionId);
}
