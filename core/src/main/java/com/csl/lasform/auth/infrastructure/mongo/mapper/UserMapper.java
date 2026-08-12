package com.csl.lasform.auth.infrastructure.mongo.mapper;

import com.csl.lasform.auth.domain.model.User;
import com.csl.lasform.auth.infrastructure.mongo.document.UserDocument;

public final class UserMapper {

    private UserMapper() {
    }

    public static User toDomain(UserDocument document) {
        if (document == null) {
            return null;
        }
        return User.builder()
                .id(document.getId())
                .orgId(document.getOrgId())
                .email(document.getEmail())
                .passwordHash(document.getPasswordHash())
                .status(document.getStatus())
                .mustResetPassword(document.isMustResetPassword())
                .createdAt(document.getCreatedAt())
                .updatedAt(document.getUpdatedAt())
                .build();
    }

    public static UserDocument toDocument(User domain) {
        if (domain == null) {
            return null;
        }
        return UserDocument.builder()
                .id(domain.getId())
                .orgId(domain.getOrgId())
                .email(domain.getEmail())
                .passwordHash(domain.getPasswordHash())
                .status(domain.getStatus())
                .mustResetPassword(domain.isMustResetPassword())
                .createdAt(domain.getCreatedAt())
                .updatedAt(domain.getUpdatedAt())
                .build();
    }
}
