package com.csl.lasform.auth.domain.repository;

import java.util.List;
import java.util.Optional;

import com.csl.lasform.auth.domain.model.User;

public interface UserRepository extends Repository<User, String> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    /** Not enforced as tenant isolation yet (single org only) — just a plain lookup. */
    List<User> findByOrgId(String orgId);
}
