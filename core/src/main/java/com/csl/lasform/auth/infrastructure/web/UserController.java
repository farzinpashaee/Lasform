package com.csl.lasform.auth.infrastructure.web;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.csl.lasform.auth.application.UserManagementService;
import com.csl.lasform.auth.domain.model.User;
import com.csl.lasform.auth.domain.repository.UserRepository;
import com.csl.lasform.auth.infrastructure.security.JwtPrincipal;
import com.csl.lasform.auth.infrastructure.web.dto.AssignRoleRequest;
import com.csl.lasform.auth.infrastructure.web.dto.CreateUserRequest;
import com.csl.lasform.auth.infrastructure.web.dto.UserResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserManagementService userManagementService;
    private final UserRepository userRepository;

    /** Flat, unpaginated — fine while there's a single org and no reason yet to expect a large user count. */
    @GetMapping
    @PreAuthorize("hasAuthority('user:read')")
    public List<UserResponse> list() {
        return userRepository.findAll().stream().map(UserResponse::from).toList();
    }

    /** New users always belong to the creating admin's org — there's no cross-org creation surface yet (single org). */
    @PostMapping
    @PreAuthorize("hasAuthority('user:invite')")
    public ResponseEntity<UserResponse> create(@Valid @RequestBody CreateUserRequest request, Authentication authentication) {
        JwtPrincipal principal = (JwtPrincipal) authentication.getPrincipal();
        User created = userManagementService.createUser(principal.orgId(), request.email(), request.temporaryPassword());
        return ResponseEntity.created(
                        ServletUriComponentsBuilder.fromCurrentRequestUri().path("/{id}").buildAndExpand(created.getId()).toUri())
                .body(UserResponse.from(created));
    }

    /** Additive: grants the given role alongside whatever the user already has (see UserManagementService#assignRole). */
    @PostMapping("/{id}/roles")
    @PreAuthorize("hasAuthority('user:manage_roles')")
    public ResponseEntity<Void> assignRole(
            @PathVariable String id, @Valid @RequestBody AssignRoleRequest request, Authentication authentication) {
        JwtPrincipal principal = (JwtPrincipal) authentication.getPrincipal();
        userManagementService.assignRole(id, request.roleId(), principal.orgId());
        return ResponseEntity.noContent().build();
    }
}
