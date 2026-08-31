package com.csl.lasform.auth.infrastructure.mongo.mapper;

import com.csl.lasform.auth.domain.model.Permission;
import com.csl.lasform.auth.infrastructure.mongo.document.PermissionDocument;

public final class PermissionMapper {

    private PermissionMapper() {
    }

    public static Permission toDomain(PermissionDocument document) {
        if (document == null) {
            return null;
        }
        return Permission.builder()
                .id(document.getId())
                .key(document.getKey())
                .description(document.getDescription())
                .build();
    }

    public static PermissionDocument toDocument(Permission domain) {
        if (domain == null) {
            return null;
        }
        return PermissionDocument.builder()
                .id(domain.getId())
                .key(domain.getKey())
                .description(domain.getDescription())
                .build();
    }
}
