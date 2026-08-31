package com.csl.lasform.auth.infrastructure.mongo.mapper;

import com.csl.lasform.auth.domain.model.RefreshToken;
import com.csl.lasform.auth.infrastructure.mongo.document.RefreshTokenDocument;

public final class RefreshTokenMapper {

    private RefreshTokenMapper() {
    }

    public static RefreshToken toDomain(RefreshTokenDocument document) {
        if (document == null) {
            return null;
        }
        return RefreshToken.builder()
                .id(document.getId())
                .userId(document.getUserId())
                .expiresAt(document.getExpiresAt())
                .revoked(document.isRevoked())
                .createdAt(document.getCreatedAt())
                .build();
    }

    public static RefreshTokenDocument toDocument(RefreshToken domain) {
        if (domain == null) {
            return null;
        }
        return RefreshTokenDocument.builder()
                .id(domain.getId())
                .userId(domain.getUserId())
                .expiresAt(domain.getExpiresAt())
                .revoked(domain.isRevoked())
                .createdAt(domain.getCreatedAt())
                .build();
    }
}
