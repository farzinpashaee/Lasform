package com.csl.lasform.auth.infrastructure.mongo;

import java.util.List;

import org.springframework.stereotype.Repository;

import com.csl.lasform.auth.domain.model.RolePermission;
import com.csl.lasform.auth.domain.repository.RolePermissionRepository;
import com.csl.lasform.auth.infrastructure.mongo.mapper.RolePermissionMapper;
import com.csl.lasform.auth.infrastructure.mongo.springdata.SpringDataRolePermissionRepository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class RolePermissionRepositoryAdapter implements RolePermissionRepository {

    private final SpringDataRolePermissionRepository springDataRepository;

    @Override
    public RolePermission save(RolePermission rolePermission) {
        return springDataRepository
                .findByRoleIdAndPermissionId(rolePermission.getRoleId(), rolePermission.getPermissionId())
                .map(RolePermissionMapper::toDomain)
                .orElseGet(() -> RolePermissionMapper.toDomain(
                        springDataRepository.save(RolePermissionMapper.toDocument(rolePermission))));
    }

    @Override
    public List<RolePermission> findByRoleId(String roleId) {
        return springDataRepository.findByRoleId(roleId).stream().map(RolePermissionMapper::toDomain).toList();
    }

    @Override
    public List<RolePermission> findByPermissionId(String permissionId) {
        return springDataRepository.findByPermissionId(permissionId).stream()
                .map(RolePermissionMapper::toDomain)
                .toList();
    }

    @Override
    public void deleteByRoleIdAndPermissionId(String roleId, String permissionId) {
        springDataRepository.deleteByRoleIdAndPermissionId(roleId, permissionId);
    }
}
