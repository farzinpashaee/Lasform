package com.csl.lasform.auth.infrastructure.web.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateAvatarRequest(
        @NotBlank(message = "{validation.auth.avatarImage.required}") String avatarImage) {
}
