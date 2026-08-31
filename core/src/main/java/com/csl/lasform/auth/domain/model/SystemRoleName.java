package com.csl.lasform.auth.domain.model;

/**
 * Names of the system roles seeded by {@code AuthSeeder} (see {@link Role#isSystemRole()}).
 * {@link #name()} is used verbatim as the persisted {@link Role#getName()} — kept here, rather
 * than as string literals, so nothing outside the seeder needs to know the exact spelling.
 */
public enum SystemRoleName {
    SUPER_ADMIN,
    ADMIN,
    OPERATOR,
    VIEWER,
    ANONYMOUS
}
