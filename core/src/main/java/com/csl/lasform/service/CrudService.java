package com.csl.lasform.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Common CRUD contract shared by every entity service. {@code findAll} is
 * intentionally paginated only — several collections (locations, events) are
 * expected to grow unbounded, so an unpaged "fetch everything" method is not
 * offered here.
 */
public interface CrudService<T, ID> {

    T create(T entity);

    T getById(ID id);

    Page<T> findAll(Pageable pageable);

    T update(ID id, T entity);

    void deleteById(ID id);

    boolean existsById(ID id);
}
