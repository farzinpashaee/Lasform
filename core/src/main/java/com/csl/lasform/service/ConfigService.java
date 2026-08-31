package com.csl.lasform.service;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.csl.lasform.model.entity.ConfigEntry;
import com.csl.lasform.repository.ConfigEntryRepository;

/**
 * Not a {@link CrudService} implementation: config entries are addressed by their own natural
 * key rather than a server-generated id, so the shape here is get/upsert/delete-by-key instead
 * of the create/getById/update/delete-by-id flow the abstract CRUD stack assumes.
 */
@Service
public class ConfigService {

    private final ConfigEntryRepository configEntryRepository;

    public ConfigService(ConfigEntryRepository configEntryRepository) {
        this.configEntryRepository = configEntryRepository;
    }

    public List<ConfigEntry> findAll() {
        return configEntryRepository.findAll(Sort.by("key"));
    }

    public Optional<ConfigEntry> findByKey(String key) {
        return configEntryRepository.findById(key);
    }

    /** Creates the entry if {@code key} is new, otherwise overwrites its value. */
    public ConfigEntry upsert(String key, String value) {
        ConfigEntry entry = configEntryRepository.findById(key).orElseGet(() -> ConfigEntry.builder().key(key).build());
        entry.setValue(value);
        return configEntryRepository.save(entry);
    }

    public void deleteByKey(String key) {
        configEntryRepository.deleteById(key);
    }
}
