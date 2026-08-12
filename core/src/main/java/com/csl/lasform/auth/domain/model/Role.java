package com.csl.lasform.auth.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * A named bundle of {@link Permission}s (via {@link RolePermission}). Business logic must never
 * branch on a role's name or id — only on the permission keys it resolves to.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode
@ToString
public class Role {

    private String id;

    private String name;

    /** System roles (e.g. seeded defaults) are not user-deletable; enforced by whichever service manages roles. */
    private boolean isSystemRole;
}
