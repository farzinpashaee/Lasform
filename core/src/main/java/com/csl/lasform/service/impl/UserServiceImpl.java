package com.csl.lasform.service.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import com.csl.lasform.exception.DuplicateResourceException;
import com.csl.lasform.exception.ResourceNotFoundException;
import com.csl.lasform.model.entity.User;
import com.csl.lasform.model.entity.enums.UserRole;
import com.csl.lasform.model.entity.enums.UserStatus;
import com.csl.lasform.repository.UserRepository;
import com.csl.lasform.service.UserService;

@Service
@Validated
public class UserServiceImpl extends AbstractCrudService<User, String> implements UserService {

    private final UserRepository userRepository;
    private final MongoTemplate mongoTemplate;

    public UserServiceImpl(UserRepository userRepository, MongoTemplate mongoTemplate) {
        super(userRepository);
        this.userRepository = userRepository;
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public User create(User entity) {
        if (userRepository.existsByUsername(entity.getUsername())) {
            throw new DuplicateResourceException("error.user.duplicateUsername", entity.getUsername());
        }
        if (userRepository.existsByEmail(entity.getEmail())) {
            throw new DuplicateResourceException("error.user.duplicateEmail", entity.getEmail());
        }
        return super.create(entity);
    }

    @Override
    public User findByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("error.user.notFoundByUsername", username));
    }

    @Override
    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("error.user.notFoundByEmail", email));
    }

    @Override
    public Page<User> search(String q, UserRole role, UserStatus status, Pageable pageable) {
        Query filter = filterQuery(q, role, status);
        long total = mongoTemplate.count(filter, User.class);
        List<User> content = mongoTemplate.find(filter.with(pageable), User.class);
        return new PageImpl<>(content, pageable, total);
    }

    /** {@code roles} is an array; equality on it means "contains". */
    private Query filterQuery(String q, UserRole role, UserStatus status) {
        List<Criteria> criteria = new ArrayList<>();
        if (role != null) {
            criteria.add(Criteria.where("roles").is(role));
        }
        if (status != null) {
            criteria.add(Criteria.where("status").is(status));
        }
        if (q != null && !q.isBlank()) {
            // Pattern.quote guards against regex metacharacters/ReDoS in user-supplied text.
            String pattern = Pattern.quote(q.trim());
            criteria.add(new Criteria().orOperator(
                    Criteria.where("username").regex(pattern, "i"),
                    Criteria.where("email").regex(pattern, "i"),
                    Criteria.where("firstName").regex(pattern, "i"),
                    Criteria.where("lastName").regex(pattern, "i")));
        }
        if (criteria.isEmpty()) {
            return new Query();
        }
        return new Query(new Criteria().andOperator(criteria.toArray(new Criteria[0])));
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
    protected String notFoundMessageCode() {
        return "error.user.notFound";
    }
}
