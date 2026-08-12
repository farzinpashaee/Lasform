package com.csl.lasform.auth.domain.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import com.csl.lasform.auth.domain.model.Permission;

public interface PermissionRepository extends Repository<Permission, String> {

    Optional<Permission> findByKey(String key);

    boolean existsByKey(String key);

    /** Used when resolving a set of granted permission ids back to their keys. */
    List<Permission> findByKeyIn(Collection<String> keys);

    /** Used when resolving a role's granted RolePermission.permissionId values back to their keys. */
    List<Permission> findByIdIn(Collection<String> ids);
}
