package com.csl.lasform.auth.infrastructure.mongo.springdata;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.csl.lasform.auth.infrastructure.mongo.document.RefreshTokenDocument;

public interface SpringDataRefreshTokenRepository extends MongoRepository<RefreshTokenDocument, String> {
}
