package com.csl.lasform.auth.infrastructure.web.dto;

import jakarta.validation.constraints.NotBlank;

public record AssignRoleRequest(@NotBlank(message = "{validation.auth.roleId.required}") String roleId) {
}
