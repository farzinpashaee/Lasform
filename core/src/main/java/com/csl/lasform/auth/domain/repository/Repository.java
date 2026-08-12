package com.csl.lasform.auth.domain.repository;

import java.util.List;
import java.util.Optional;

/** Common CRUD port shared by the auth entities that have a synthetic id (Organization, User, Role, Permission). */
public interface Repository<T, ID> {

    T save(T entity);

    Optional<T> findById(ID id);

    List<T> findAll();

    void deleteById(ID id);

    boolean existsById(ID id);
}
