package com.csl.lasform.auth.infrastructure.mongo.springdata;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.csl.lasform.auth.infrastructure.mongo.document.UserDocument;

public interface SpringDataUserRepository extends MongoRepository<UserDocument, String> {

    Optional<UserDocument> findByEmail(String email);

    boolean existsByEmail(String email);

    List<UserDocument> findByOrgId(String orgId);
}
