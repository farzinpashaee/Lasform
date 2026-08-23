package com.csl.lasform.auth.infrastructure.web.dto;

import com.csl.lasform.auth.domain.model.UserStatus;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Admin editing another user's profile info and status — distinct from UpdateProfileRequest (self-service, no status). */
public record UpdateUserRequest(
        @Size(max = 100, message = "{validation.auth.displayName.tooLong}") String displayName,
        @NotNull(message = "{validation.auth.status.required}") UserStatus status) {
}
