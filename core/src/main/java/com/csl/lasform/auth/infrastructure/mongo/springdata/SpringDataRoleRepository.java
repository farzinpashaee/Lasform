package com.csl.lasform.auth.infrastructure.mongo.springdata;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.csl.lasform.auth.infrastructure.mongo.document.RoleDocument;

public interface SpringDataRoleRepository extends MongoRepository<RoleDocument, String> {

    Optional<RoleDocument> findByName(String name);

    boolean existsByName(String name);
}
