package com.csl.lasform.auth.infrastructure.mongo.document;

import java.time.Instant;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
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
@Document(collection = "refresh_tokens")
public class RefreshTokenDocument {

    @Id
    private String id;

    @Indexed
    private String userId;

    // TTL index: Mongo's background task deletes the document once this instant is in the past,
    // so expired refresh tokens don't need a manual cleanup job.
    @Indexed(name = "refresh_token_ttl", expireAfter = "0s")
    private Instant expiresAt;

    private boolean revoked;

    @CreatedDate
    private Instant createdAt;
}
