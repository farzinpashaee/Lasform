package com.csl.lasform.auth.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Assigns a {@link Role} to a {@link User} within an org. Identified by its (userId, roleId,
 * orgId) triple, not a synthetic id. {@code orgId} is carried now so multi-tenant isolation can be
 * introduced later without a migration; it is not enforced yet (single org only).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode
@ToString
public class UserRole {

    private String userId;

    private String roleId;

    private String orgId;
}
