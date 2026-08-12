package com.csl.lasform.auth.domain.repository;

import java.util.Optional;

import com.csl.lasform.auth.domain.model.Role;

public interface RoleRepository extends Repository<Role, String> {

    Optional<Role> findByName(String name);

    boolean existsByName(String name);
}
