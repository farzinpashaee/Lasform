package com.csl.lasform.repository;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.csl.lasform.model.entity.User;

public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);
}
