package com.csl.lasform.auth.infrastructure.mongo.mapper;

import com.csl.lasform.auth.domain.model.RolePermission;
import com.csl.lasform.auth.infrastructure.mongo.document.RolePermissionDocument;

public final class RolePermissionMapper {

    private RolePermissionMapper() {
    }

    public static RolePermission toDomain(RolePermissionDocument document) {
        if (document == null) {
            return null;
        }
        return RolePermission.builder()
                .roleId(document.getRoleId())
                .permissionId(document.getPermissionId())
                .build();
    }

    /** Never carries the Mongo {@code _id} — the domain model has none; the adapter decides insert vs. no-op. */
    public static RolePermissionDocument toDocument(RolePermission domain) {
        if (domain == null) {
            return null;
        }
        return RolePermissionDocument.builder()
                .roleId(domain.getRoleId())
                .permissionId(domain.getPermissionId())
                .build();
    }
}
