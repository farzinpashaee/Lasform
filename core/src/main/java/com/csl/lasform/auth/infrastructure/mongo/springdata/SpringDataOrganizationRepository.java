package com.csl.lasform.auth.infrastructure.mongo.springdata;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.csl.lasform.auth.infrastructure.mongo.document.OrganizationDocument;

public interface SpringDataOrganizationRepository extends MongoRepository<OrganizationDocument, String> {
}
