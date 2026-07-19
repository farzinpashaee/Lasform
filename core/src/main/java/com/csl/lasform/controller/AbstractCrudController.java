package com.csl.lasform.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.csl.lasform.model.entity.Identifiable;
import com.csl.lasform.service.CrudService;

import jakarta.validation.Valid;

/**
 * Common REST verbs shared by every entity controller. Subclasses only need to
 * supply their {@link CrudService} and any entity-specific search endpoints.
 */
public abstract class AbstractCrudController<T extends Identifiable> {

    protected abstract CrudService<T, String> service();

    @PostMapping
    public ResponseEntity<T> create(@Valid @RequestBody T entity) {
        T created = service().create(entity);
        // fromCurrentRequestUri() is the POST's own URL (".../resource"); the plain
        // UriComponentsBuilder Spring can auto-inject here resolves to the context
        // path instead and would drop the resource segment from the Location header.
        return ResponseEntity
                .created(ServletUriComponentsBuilder.fromCurrentRequestUri()
                        .path("/{id}")
                        .buildAndExpand(created.getId())
                        .toUri())
                .body(created);
    }

    @GetMapping("/{id}")
    public T getById(@PathVariable String id) {
        return service().getById(id);
    }

    @GetMapping
    public Page<T> list(Pageable pageable) {
        return service().findAll(pageable);
    }

    // PATCH, not PUT: update() is a partial merge (see AbstractCrudService), and a
    // partial payload legitimately omits fields a PUT's full-object semantics would require.
    @PatchMapping("/{id}")
    public T update(@PathVariable String id, @RequestBody T entity) {
        return service().update(id, entity);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service().deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
