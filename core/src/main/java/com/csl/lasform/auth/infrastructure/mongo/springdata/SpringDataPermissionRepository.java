package com.csl.lasform.auth.infrastructure.mongo.springdata;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.csl.lasform.auth.infrastructure.mongo.document.PermissionDocument;

public interface SpringDataPermissionRepository extends MongoRepository<PermissionDocument, String> {

    Optional<PermissionDocument> findByKey(String key);

    boolean existsByKey(String key);

    List<PermissionDocument> findByKeyIn(Collection<String> keys);
}
