package com.csl.lasform.auth.infrastructure.mongo.document;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode
@ToString
@Document(collection = "role_permissions")
@CompoundIndex(name = "role_permission_unique", def = "{'roleId': 1, 'permissionId': 1}", unique = true)
public class RolePermissionDocument {

    @Id
    private String id;

    private String roleId;

    private String permissionId;
}
