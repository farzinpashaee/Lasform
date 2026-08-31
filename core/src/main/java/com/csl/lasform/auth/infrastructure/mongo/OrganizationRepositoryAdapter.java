package com.csl.lasform.auth.infrastructure.mongo;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.csl.lasform.auth.domain.model.Organization;
import com.csl.lasform.auth.domain.repository.OrganizationRepository;
import com.csl.lasform.auth.infrastructure.mongo.mapper.OrganizationMapper;
import com.csl.lasform.auth.infrastructure.mongo.springdata.SpringDataOrganizationRepository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class OrganizationRepositoryAdapter implements OrganizationRepository {

    private final SpringDataOrganizationRepository springDataRepository;

    @Override
    public Organization save(Organization organization) {
        return OrganizationMapper.toDomain(springDataRepository.save(OrganizationMapper.toDocument(organization)));
    }

    @Override
    public Optional<Organization> findById(String id) {
        return springDataRepository.findById(id).map(OrganizationMapper::toDomain);
    }

    @Override
    public List<Organization> findAll() {
        return springDataRepository.findAll().stream().map(OrganizationMapper::toDomain).toList();
    }

    @Override
    public void deleteById(String id) {
        springDataRepository.deleteById(id);
    }

    @Override
    public boolean existsById(String id) {
        return springDataRepository.existsById(id);
    }
}
