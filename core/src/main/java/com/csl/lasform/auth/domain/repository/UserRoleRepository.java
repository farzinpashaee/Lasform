package com.csl.lasform.auth.domain.repository;

import java.util.List;

import com.csl.lasform.auth.domain.model.UserRole;

/**
 * Identified by its (userId, roleId, orgId) triple rather than a synthetic id, so this port is
 * shaped around that natural key instead of extending {@link Repository}.
 */
public interface UserRoleRepository {

    /** Idempotent: assigning a role a user already has is a no-op, not a duplicate. */
    UserRole save(UserRole userRole);

    List<UserRole> findByUserId(String userId);

    List<UserRole> findByRoleId(String roleId);

    void deleteByUserIdAndRoleIdAndOrgId(String userId, String roleId, String orgId);
}
