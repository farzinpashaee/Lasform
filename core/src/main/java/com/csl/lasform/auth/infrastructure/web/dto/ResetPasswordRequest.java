package com.csl.lasform.auth.infrastructure.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "{validation.auth.password.required}")
                @Size(min = 8, message = "{validation.auth.password.tooShort}")
                String newPassword) {
}
