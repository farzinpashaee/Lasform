package com.csl.lasform.auth.infrastructure.web.dto;

import java.time.Instant;

import com.csl.lasform.auth.domain.model.User;
import com.csl.lasform.auth.domain.model.UserStatus;

/** {@code passwordHash} is deliberately excluded — never serialized back to a client. */
public record UserResponse(
        String id,
        String orgId,
        String email,
        String displayName,
        UserStatus status,
        boolean mustResetPassword,
        Instant createdAt) {

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getOrgId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getStatus(),
                user.isMustResetPassword(),
                user.getCreatedAt());
    }
}
