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
 * A tenant. Multi-tenant isolation (cross-org query scoping, org-switching) is not implemented
 * yet — today there is exactly one organization — but every entity that will eventually need to
 * be scoped by it already carries an {@code orgId}, so introducing isolation later doesn't require
 * a migration.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode
@ToString
public class Organization {

    private String id;

    private String name;

    private Instant createdAt;
}
