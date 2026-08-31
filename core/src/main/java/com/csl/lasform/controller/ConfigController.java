package com.csl.lasform.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.csl.lasform.exception.ResourceNotFoundException;
import com.csl.lasform.model.entity.ConfigEntry;
import com.csl.lasform.service.ConfigService;

import jakarta.validation.Valid;

/**
 * Generic key/value application settings — e.g. {@code lasform.security.sso.google.client.id}, {@code
 * map.google.api.key}. {@link #get} is deliberately open (no {@code @PreAuthorize}): these
 * keys are the kind of value that was previously shipped straight in the frontend bundle (a
 * Google OAuth client id, a Maps API key), so the login page and public map need to read them
 * before a caller has authenticated. Listing every key and writing are both admin-only.
 */
@RestController
@RequestMapping("/api/v1/config")
public class ConfigController {

    private final ConfigService configService;

    public ConfigController(ConfigService configService) {
        this.configService = configService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('config:read')")
    public List<ConfigEntry> list() {
        return configService.findAll();
    }

    @GetMapping("/{key}")
    public ConfigEntry get(@PathVariable String key) {
        return configService.findByKey(key).orElseThrow(() -> new ResourceNotFoundException("error.config.notFound", key));
    }

    @PutMapping("/{key}")
    @PreAuthorize("hasAuthority('config:write')")
    public ConfigEntry upsert(@PathVariable String key, @Valid @RequestBody UpsertConfigRequest request) {
        return configService.upsert(key, request.value());
    }

    @DeleteMapping("/{key}")
    @PreAuthorize("hasAuthority('config:write')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String key) {
        configService.deleteByKey(key);
    }
}
