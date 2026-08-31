package com.csl.lasform.auth.infrastructure.mongo;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.csl.lasform.auth.domain.model.RefreshToken;
import com.csl.lasform.auth.domain.repository.RefreshTokenRepository;
import com.csl.lasform.auth.infrastructure.mongo.mapper.RefreshTokenMapper;
import com.csl.lasform.auth.infrastructure.mongo.springdata.SpringDataRefreshTokenRepository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class RefreshTokenRepositoryAdapter implements RefreshTokenRepository {

    private final SpringDataRefreshTokenRepository springDataRepository;

    @Override
    public RefreshToken save(RefreshToken refreshToken) {
        return RefreshTokenMapper.toDomain(springDataRepository.save(RefreshTokenMapper.toDocument(refreshToken)));
    }

    @Override
    public Optional<RefreshToken> findById(String id) {
        return springDataRepository.findById(id).map(RefreshTokenMapper::toDomain);
    }

    @Override
    public List<RefreshToken> findAll() {
        return springDataRepository.findAll().stream().map(RefreshTokenMapper::toDomain).toList();
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
