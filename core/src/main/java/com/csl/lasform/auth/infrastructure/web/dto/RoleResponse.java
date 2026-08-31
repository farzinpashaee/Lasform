package com.csl.lasform.auth.infrastructure.web.dto;

import com.csl.lasform.auth.domain.model.Role;

public record RoleResponse(String id, String name, boolean isSystemRole) {

    public static RoleResponse from(Role role) {
        return new RoleResponse(role.getId(), role.getName(), role.isSystemRole());
    }
}
