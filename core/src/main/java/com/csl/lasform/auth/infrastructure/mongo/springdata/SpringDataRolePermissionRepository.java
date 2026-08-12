package com.csl.lasform.auth.infrastructure.mongo.springdata;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.csl.lasform.auth.infrastructure.mongo.document.RolePermissionDocument;

public interface SpringDataRolePermissionRepository extends MongoRepository<RolePermissionDocument, String> {

    List<RolePermissionDocument> findByRoleId(String roleId);

    List<RolePermissionDocument> findByPermissionId(String permissionId);

    Optional<RolePermissionDocument> findByRoleIdAndPermissionId(String roleId, String permissionId);

    void deleteByRoleIdAndPermissionId(String roleId, String permissionId);
}
