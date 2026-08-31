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
@Document(collection = "user_roles")
@CompoundIndex(name = "user_role_org_unique", def = "{'userId': 1, 'roleId': 1, 'orgId': 1}", unique = true)
public class UserRoleDocument {

    @Id
    private String id;

    private String userId;

    private String roleId;

    private String orgId;
}
