package com.csl.lasform.auth.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/** Grants a {@link Permission} to a {@link Role}. Identified by its (roleId, permissionId) pair, not a synthetic id. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode
@ToString
public class RolePermission {

    private String roleId;

    private String permissionId;
}
