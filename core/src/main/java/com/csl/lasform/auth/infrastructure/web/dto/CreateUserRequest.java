package com.csl.lasform.auth.infrastructure.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateUserRequest(
        @NotBlank(message = "{validation.auth.email.required}") @Email(message = "{validation.auth.email.invalid}") String email,
        @NotBlank(message = "{validation.auth.password.required}")
                @Size(min = 8, message = "{validation.auth.password.tooShort}")
                String temporaryPassword) {
}
