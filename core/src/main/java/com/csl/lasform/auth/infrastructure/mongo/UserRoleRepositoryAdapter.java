package com.csl.lasform.auth.infrastructure.mongo;

import java.util.List;

import org.springframework.stereotype.Repository;

import com.csl.lasform.auth.domain.model.UserRole;
import com.csl.lasform.auth.domain.repository.UserRoleRepository;
import com.csl.lasform.auth.infrastructure.mongo.mapper.UserRoleMapper;
import com.csl.lasform.auth.infrastructure.mongo.springdata.SpringDataUserRoleRepository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class UserRoleRepositoryAdapter implements UserRoleRepository {

    private final SpringDataUserRoleRepository springDataRepository;

    @Override
    public UserRole save(UserRole userRole) {
        return springDataRepository
                .findByUserIdAndRoleIdAndOrgId(userRole.getUserId(), userRole.getRoleId(), userRole.getOrgId())
                .map(UserRoleMapper::toDomain)
                .orElseGet(() -> UserRoleMapper.toDomain(springDataRepository.save(UserRoleMapper.toDocument(userRole))));
    }

    @Override
    public List<UserRole> findByUserId(String userId) {
        return springDataRepository.findByUserId(userId).stream().map(UserRoleMapper::toDomain).toList();
    }

    @Override
    public List<UserRole> findByRoleId(String roleId) {
        return springDataRepository.findByRoleId(roleId).stream().map(UserRoleMapper::toDomain).toList();
    }

    @Override
    public void deleteByUserIdAndRoleIdAndOrgId(String userId, String roleId, String orgId) {
        springDataRepository.deleteByUserIdAndRoleIdAndOrgId(userId, roleId, orgId);
    }
}
