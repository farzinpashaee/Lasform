package com.csl.lasform.auth.infrastructure.mongo;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.csl.lasform.auth.domain.model.Permission;
import com.csl.lasform.auth.domain.repository.PermissionRepository;
import com.csl.lasform.auth.infrastructure.mongo.mapper.PermissionMapper;
import com.csl.lasform.auth.infrastructure.mongo.springdata.SpringDataPermissionRepository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class PermissionRepositoryAdapter implements PermissionRepository {

    private final SpringDataPermissionRepository springDataRepository;

    @Override
    public Permission save(Permission permission) {
        return PermissionMapper.toDomain(springDataRepository.save(PermissionMapper.toDocument(permission)));
    }

    @Override
    public Optional<Permission> findById(String id) {
        return springDataRepository.findById(id).map(PermissionMapper::toDomain);
    }

    @Override
    public List<Permission> findAll() {
        return springDataRepository.findAll().stream().map(PermissionMapper::toDomain).toList();
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
    public Optional<Permission> findByKey(String key) {
        return springDataRepository.findByKey(key).map(PermissionMapper::toDomain);
    }

    @Override
    public boolean existsByKey(String key) {
        return springDataRepository.existsByKey(key);
    }

    @Override
    public List<Permission> findByKeyIn(Collection<String> keys) {
        return springDataRepository.findByKeyIn(keys).stream().map(PermissionMapper::toDomain).toList();
    }

    @Override
    public List<Permission> findByIdIn(Collection<String> ids) {
        // MongoRepository already provides a batch-by-id lookup; no need for a custom query method.
        return springDataRepository.findAllById(ids).stream().map(PermissionMapper::toDomain).toList();
    }
}
