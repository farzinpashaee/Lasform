package com.csl.lasform.auth.infrastructure.mongo.mapper;

import com.csl.lasform.auth.domain.model.Organization;
import com.csl.lasform.auth.infrastructure.mongo.document.OrganizationDocument;

public final class OrganizationMapper {

    private OrganizationMapper() {
    }

    public static Organization toDomain(OrganizationDocument document) {
        if (document == null) {
            return null;
        }
        return Organization.builder()
                .id(document.getId())
                .name(document.getName())
                .createdAt(document.getCreatedAt())
                .build();
    }

    public static OrganizationDocument toDocument(Organization domain) {
        if (domain == null) {
            return null;
        }
        return OrganizationDocument.builder()
                .id(domain.getId())
                .name(domain.getName())
                .createdAt(domain.getCreatedAt())
                .build();
    }
}
