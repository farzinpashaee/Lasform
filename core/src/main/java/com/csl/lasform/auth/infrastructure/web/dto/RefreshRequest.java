package com.csl.lasform.auth.infrastructure.web.dto;

import jakarta.validation.constraints.NotBlank;

public record RefreshRequest(@NotBlank(message = "{validation.auth.refreshToken.required}") String refreshToken) {
}
