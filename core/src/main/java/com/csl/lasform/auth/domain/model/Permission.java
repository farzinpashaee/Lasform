package com.csl.lasform.auth.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * An atomic capability (e.g. {@code "device:write"}). The set of valid permissions is fixed and
 * code-defined by {@link PermissionKey} — this is a read model for whatever is currently seeded
 * from that catalog, not a user-editable resource; there is deliberately no API to create or
 * rename one.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode
@ToString
public class Permission {

    private String id;

    private String key;

    private String description;
}
