package com.csl.lasform.auth.domain.model;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * An authenticatable principal. Permissions are never granted directly — they flow from the
 * {@link Role}s assigned via {@link UserRole}, resolved to a flat permission set at auth time.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode
@ToString
public class User {

    private String id;

    private String orgId;

    private String email;

    private String passwordHash;

    private UserStatus status;

    /** True when this account still needs a first/forced password change (default for admin-created users). */
    @Builder.Default
    private boolean mustResetPassword = true;

    private Instant createdAt;

    private Instant updatedAt;
}
