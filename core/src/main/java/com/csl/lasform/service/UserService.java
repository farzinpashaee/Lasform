package com.csl.lasform.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.csl.lasform.model.entity.User;
import com.csl.lasform.model.entity.enums.UserRole;
import com.csl.lasform.model.entity.enums.UserStatus;

public interface UserService extends CrudService<User, String> {

    User findByUsername(String username);

    User findByEmail(String email);

    /** Paginated/sortable listing, optionally filtered by free-text {@code q} (username/email/name), role, and/or status. */
    Page<User> search(String q, UserRole role, UserStatus status, Pageable pageable);
}
