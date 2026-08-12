package com.csl.lasform.auth.infrastructure.security;

import java.util.Set;

public record AccessTokenClaims(String userId, String orgId, Set<String> permissions, boolean mustResetPassword) {
}
