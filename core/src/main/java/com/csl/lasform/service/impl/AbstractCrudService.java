package com.csl.lasform.service.impl;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import com.csl.lasform.exception.ResourceNotFoundException;
import com.csl.lasform.service.CrudService;

/**
 * Base implementation shared by every entity service. Update is a merge, not a
 * replace: {@link #getById} loads the current document and {@link #applyUpdate}
 * copies the mutable fields onto it, so identity/audit fields (id, createdAt,
 * version, ...) can't be clobbered by a caller-supplied entity.
 */
public abstract class AbstractCrudService<T, ID> implements CrudService<T, ID> {

    protected final MongoRepository<T, ID> repository;

    protected AbstractCrudService(MongoRepository<T, ID> repository) {
        this.repository = repository;
    }

    @Override
    public T create(T entity) {
        return repository.save(entity);
    }

    @Override
    public T getById(ID id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(entityName() + " not found: " + id));
    }

    @Override
    public Page<T> findAll(Pageable pageable) {
        return repository.findAll(pageable);
    }

    @Override
    public T update(ID id, T entity) {
        T existing = getById(id);
        applyUpdate(existing, entity);
        return repository.save(existing);
    }

    @Override
    public void deleteById(ID id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException(entityName() + " not found: " + id);
        }
        repository.deleteById(id);
    }

    @Override
    public boolean existsById(ID id) {
        return repository.existsById(id);
    }

    /** Copy the mutable fields of {@code incoming} onto {@code existing}. */
    protected abstract void applyUpdate(T existing, T incoming);

    protected abstract String entityName();
}
