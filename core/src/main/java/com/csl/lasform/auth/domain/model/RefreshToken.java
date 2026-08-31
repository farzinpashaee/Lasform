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
 * A record of an issued refresh token, keyed by its own {@code id} (which doubles as the JWT's
 * {@code jti} claim) so a presented refresh token can be revoked/expired independent of its
 * signature still being valid. The token string itself is never stored — only this record.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode
@ToString
public class RefreshToken {

    private String id;

    private String userId;

    private Instant expiresAt;

    @Builder.Default
    private boolean revoked = false;

    private Instant createdAt;
}
