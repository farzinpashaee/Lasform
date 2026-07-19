package com.csl.lasform.service.impl;

import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import com.csl.lasform.exception.DuplicateResourceException;
import com.csl.lasform.exception.ResourceNotFoundException;
import com.csl.lasform.model.entity.User;
import com.csl.lasform.repository.UserRepository;
import com.csl.lasform.service.UserService;

@Service
@Validated
public class UserServiceImpl extends AbstractCrudService<User, String> implements UserService {

    private final UserRepository userRepository;

    public UserServiceImpl(UserRepository userRepository) {
        super(userRepository);
        this.userRepository = userRepository;
    }

    @Override
    public User create(User entity) {
        if (userRepository.existsByUsername(entity.getUsername())) {
            throw new DuplicateResourceException("Username already in use: " + entity.getUsername());
        }
        if (userRepository.existsByEmail(entity.getEmail())) {
            throw new DuplicateResourceException("Email already in use: " + entity.getEmail());
        }
        return super.create(entity);
    }

    @Override
    public User findByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
    }

    @Override
    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
    }

    @Override
    protected void applyUpdate(User existing, User incoming) {
        existing.setFirstName(incoming.getFirstName());
        existing.setLastName(incoming.getLastName());
        existing.setPhone(incoming.getPhone());
        existing.setRoles(incoming.getRoles());
        existing.setStatus(incoming.getStatus());
        if (incoming.getPasswordHash() != null) {
            existing.setPasswordHash(incoming.getPasswordHash());
        }
    }

    @Override
    protected String entityName() {
        return "User";
    }
}
