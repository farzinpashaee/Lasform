package com.csl.lasform.auth.infrastructure.mongo.mapper;

import com.csl.lasform.auth.domain.model.UserRole;
import com.csl.lasform.auth.infrastructure.mongo.document.UserRoleDocument;

public final class UserRoleMapper {

    private UserRoleMapper() {
    }

    public static UserRole toDomain(UserRoleDocument document) {
        if (document == null) {
            return null;
        }
        return UserRole.builder()
                .userId(document.getUserId())
                .roleId(document.getRoleId())
                .orgId(document.getOrgId())
                .build();
    }

    /** Never carries the Mongo {@code _id} — the domain model has none; the adapter decides insert vs. no-op. */
    public static UserRoleDocument toDocument(UserRole domain) {
        if (domain == null) {
            return null;
        }
        return UserRoleDocument.builder()
                .userId(domain.getUserId())
                .roleId(domain.getRoleId())
                .orgId(domain.getOrgId())
                .build();
    }
}
