package com.csl.lasform.auth.infrastructure.mongo;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.csl.lasform.auth.domain.model.Role;
import com.csl.lasform.auth.domain.repository.RoleRepository;
import com.csl.lasform.auth.infrastructure.mongo.mapper.RoleMapper;
import com.csl.lasform.auth.infrastructure.mongo.springdata.SpringDataRoleRepository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class RoleRepositoryAdapter implements RoleRepository {

    private final SpringDataRoleRepository springDataRepository;

    @Override
    public Role save(Role role) {
        return RoleMapper.toDomain(springDataRepository.save(RoleMapper.toDocument(role)));
    }

    @Override
    public Optional<Role> findById(String id) {
        return springDataRepository.findById(id).map(RoleMapper::toDomain);
    }

    @Override
    public List<Role> findAll() {
        return springDataRepository.findAll().stream().map(RoleMapper::toDomain).toList();
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
    public Optional<Role> findByName(String name) {
        return springDataRepository.findByName(name).map(RoleMapper::toDomain);
    }

    @Override
    public boolean existsByName(String name) {
        return springDataRepository.existsByName(name);
    }
}
