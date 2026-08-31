package com.csl.lasform.auth.infrastructure.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank(message = "{validation.auth.displayName.required}")
                @Size(max = 100, message = "{validation.auth.displayName.tooLong}")
                String displayName) {
}
