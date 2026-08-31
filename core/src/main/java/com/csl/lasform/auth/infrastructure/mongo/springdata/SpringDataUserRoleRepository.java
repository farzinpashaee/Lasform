package com.csl.lasform.auth.infrastructure.mongo.springdata;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.csl.lasform.auth.infrastructure.mongo.document.UserRoleDocument;

public interface SpringDataUserRoleRepository extends MongoRepository<UserRoleDocument, String> {

    List<UserRoleDocument> findByUserId(String userId);

    List<UserRoleDocument> findByRoleId(String roleId);

    Optional<UserRoleDocument> findByUserIdAndRoleIdAndOrgId(String userId, String roleId, String orgId);

    void deleteByUserIdAndRoleIdAndOrgId(String userId, String roleId, String orgId);
}
