package com.csl.lasform.auth.infrastructure.mongo;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.csl.lasform.auth.domain.model.User;
import com.csl.lasform.auth.domain.repository.UserRepository;
import com.csl.lasform.auth.infrastructure.mongo.mapper.UserMapper;
import com.csl.lasform.auth.infrastructure.mongo.springdata.SpringDataUserRepository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class UserRepositoryAdapter implements UserRepository {

    private final SpringDataUserRepository springDataRepository;

    @Override
    public User save(User user) {
        return UserMapper.toDomain(springDataRepository.save(UserMapper.toDocument(user)));
    }

    @Override
    public Optional<User> findById(String id) {
        return springDataRepository.findById(id).map(UserMapper::toDomain);
    }

    @Override
    public List<User> findAll() {
        return springDataRepository.findAll().stream().map(UserMapper::toDomain).toList();
    }

    @Override
    public void deleteById(String id) {
        springDataRepository.deleteById(id);
    }

    @Override
    public boolean existsById(String id) {
        return springDataRepository.existsById(id);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return springDataRepository.findByEmail(email).map(UserMapper::toDomain);
    }

    @Override
    public boolean existsByEmail(String email) {
        return springDataRepository.existsByEmail(email);
    }

    @Override
    public List<User> findByOrgId(String orgId) {
        return springDataRepository.findByOrgId(orgId).stream().map(UserMapper::toDomain).toList();
    }
}
