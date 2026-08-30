package com.csl.lasform.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import jakarta.validation.Valid;

/**
 * Common CRUD contract shared by every entity service. {@code findAll} is
 * intentionally paginated only — several collections (locations, events) are
 * expected to grow unbounded, so an unpaged "fetch everything" method is not
 * offered here.
 *
 * <p>{@code @Valid} is declared here, once, and deliberately not repeated on
 * any overriding method — Bean Validation forbids an override from adding or
 * altering the parameter constraints of the method it overrides. It is only
 * applied to {@link #create}: {@link #update} is a partial merge (see
 * {@code AbstractCrudService}), so a payload legitimately omits fields the
 * entity otherwise requires, and whole-object validation would reject it.
 */
public interface CrudService<T, ID> {

    T create(@Valid T entity);

    T getById(ID id);

    Page<T> findAll(Pageable pageable);

    T update(ID id, T entity);

    void deleteById(ID id);

    boolean existsById(ID id);
}
