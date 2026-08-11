package com.csl.lasform.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.csl.lasform.model.entity.User;
import com.csl.lasform.model.entity.enums.UserRole;
import com.csl.lasform.model.entity.enums.UserStatus;
import com.csl.lasform.service.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/users")
public class UserController extends AbstractCrudController<User> {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @Override
    protected UserService service() {
        return userService;
    }

    @PostMapping
    public ResponseEntity<User> create(@Valid @RequestBody User entity) {
        return createOne(entity);
    }

    @GetMapping("/by-username/{username}")
    public User getByUsername(@PathVariable String username) {
        return userService.findByUsername(username);
    }

    @GetMapping("/by-email/{email}")
    public User getByEmail(@PathVariable String email) {
        return userService.findByEmail(email);
    }

    /** Paginated/sortable listing for the management table: optional free-text {@code q}, role and/or status filters. */
    @GetMapping("/search")
    public Page<User> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UserRole role,
            @RequestParam(required = false) UserStatus status,
            Pageable pageable) {
        return userService.search(q, role, status, pageable);
    }
}
