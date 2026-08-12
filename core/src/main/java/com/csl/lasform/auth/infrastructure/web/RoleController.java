package com.csl.lasform.auth.infrastructure.web;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.csl.lasform.auth.domain.repository.RoleRepository;
import com.csl.lasform.auth.infrastructure.web.dto.RoleResponse;

import lombok.RequiredArgsConstructor;

/**
 * Read-only for now — no role CRUD surface exists yet (that's what the seeded but currently
 * unchecked {@code role:manage} permission is reserved for). This one endpoint exists to power
 * the role picker on the "assign a role to a user" admin screen, which is why it's gated by
 * {@code user:manage_roles} rather than {@code role:manage}.
 */
@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleRepository roleRepository;

    @GetMapping
    @PreAuthorize("hasAuthority('user:manage_roles')")
    public List<RoleResponse> list() {
        return roleRepository.findAll().stream().map(RoleResponse::from).toList();
    }
}
