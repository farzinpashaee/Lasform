package com.csl.lasform.auth.infrastructure.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "{validation.auth.email.required}") @Email(message = "{validation.auth.email.invalid}") String email,
        @NotBlank(message = "{validation.auth.password.required}") String password) {
}
