package com.csl.lasform.auth.infrastructure.mongo.mapper;

import com.csl.lasform.auth.domain.model.Role;
import com.csl.lasform.auth.infrastructure.mongo.document.RoleDocument;

public final class RoleMapper {

    private RoleMapper() {
    }

    public static Role toDomain(RoleDocument document) {
        if (document == null) {
            return null;
        }
        return Role.builder()
                .id(document.getId())
                .name(document.getName())
                .isSystemRole(document.isSystemRole())
                .build();
    }

    public static RoleDocument toDocument(Role domain) {
        if (domain == null) {
            return null;
        }
        return RoleDocument.builder()
                .id(domain.getId())
                .name(domain.getName())
                .isSystemRole(domain.isSystemRole())
                .build();
    }
}
