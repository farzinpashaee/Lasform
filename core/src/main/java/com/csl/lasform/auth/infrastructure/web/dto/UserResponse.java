package com.csl.lasform.auth.infrastructure.web.dto;

import java.time.Instant;
import java.util.List;

import com.csl.lasform.auth.domain.model.User;
import com.csl.lasform.auth.domain.model.UserStatus;

/** {@code passwordHash} is deliberately excluded — never serialized back to a client. */
public record UserResponse(
        String id,
        String orgId,
        String email,
        String displayName,
        String avatarUrl,
        UserStatus status,
        boolean mustResetPassword,
        Instant createdAt,
        List<String> roleNames) {

    /** For call sites that haven't looked up the user's roles (e.g. create/updateOwnProfile) — an empty list, not a lie about having none. */
    public static UserResponse from(User user) {
        return from(user, List.of());
    }

    public static UserResponse from(User user, List<String> roleNames) {
        return new UserResponse(
                user.getId(),
                user.getOrgId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getAvatarUrl(),
                user.getStatus(),
                user.isMustResetPassword(),
                user.getCreatedAt(),
                roleNames);
    }
}
