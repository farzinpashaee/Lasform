package com.csl.lasform.service;

import com.csl.lasform.model.entity.User;

public interface UserService extends CrudService<User, String> {

    User findByUsername(String username);

    User findByEmail(String email);
}
