package com.csl.lasform.repository;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.csl.lasform.model.entity.ConfigEntry;

public interface ConfigEntryRepository extends MongoRepository<ConfigEntry, String> {
}
