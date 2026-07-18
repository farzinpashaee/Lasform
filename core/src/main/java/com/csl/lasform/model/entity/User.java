package com.csl.lasform.model.entity;

import java.util.HashSet;
import java.util.Set;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import com.csl.lasform.model.entity.enums.UserRole;
import com.csl.lasform.model.entity.enums.UserStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
@Document(collection = "users")
public class User extends Auditable {

    @Id
    private String id;

    @Indexed(unique = true)
    @NotBlank
    private String username;

    @Indexed(unique = true)
    @Email
    @NotBlank
    private String email;

    @JsonIgnore
    @NotBlank
    @Field("password_hash")
    private String passwordHash;

    private String firstName;

    private String lastName;

    private String phone;

    @Builder.Default
    private Set<UserRole> roles = new HashSet<>();

    @Builder.Default
    private UserStatus status = UserStatus.PENDING_VERIFICATION;

    private Instant lastLoginAt;

    @Version
    private Long version;
}
