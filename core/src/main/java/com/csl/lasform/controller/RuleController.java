package com.csl.lasform.controller;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.csl.lasform.auth.infrastructure.security.JwtPrincipal;
import com.csl.lasform.exception.BadRequestException;
import com.csl.lasform.model.entity.Event;
import com.csl.lasform.model.entity.Rule;
import com.csl.lasform.model.entity.RuleConditionGroup;
import com.csl.lasform.service.RuleConditionEvaluator;
import com.csl.lasform.service.RuleService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/rules")
public class RuleController extends AbstractCrudController<Rule> {

    private final RuleService ruleService;
    private final RuleConditionEvaluator ruleConditionEvaluator;

    public RuleController(RuleService ruleService, RuleConditionEvaluator ruleConditionEvaluator) {
        this.ruleService = ruleService;
        this.ruleConditionEvaluator = ruleConditionEvaluator;
    }

    @Override
    protected RuleService service() {
        return ruleService;
    }

    // See DeviceController for why the mapping annotation must be repeated on each override.

    @Override
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('rule:read')")
    public Rule getById(@PathVariable String id) {
        return super.getById(id);
    }

    @Override
    @GetMapping
    @PreAuthorize("hasAuthority('rule:read')")
    public Page<Rule> list(Pageable pageable) {
        return super.list(pageable);
    }

    @Override
    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('rule:write')")
    public Rule update(@PathVariable String id, @RequestBody Rule entity) {
        return super.update(id, entity);
    }

    @Override
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('rule:delete')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        return super.delete(id);
    }

    /** ownerId is never client-supplied — it's always the creating admin's org (see Rule#ownerId). */
    @PostMapping
    @PreAuthorize("hasAuthority('rule:write')")
    public ResponseEntity<Rule> create(@Valid @RequestBody Rule entity, Authentication authentication) {
        JwtPrincipal principal = (JwtPrincipal) authentication.getPrincipal();
        entity.setOwnerId(principal.orgId());
        return createOne(entity);
    }

    @GetMapping("/search")
    @PreAuthorize("hasAuthority('rule:read')")
    public List<Rule> search(@RequestParam(required = false) String ownerId) {
        if (ownerId != null) {
            return ruleService.findByOwnerId(ownerId);
        }
        throw new BadRequestException("error.rule.filterRequired");
    }

    /**
     * Lets the rule editor's condition-group node "Test" a draft against a pasted sample event
     * before saving — nothing is persisted. The one deliberate DTO in this codebase (see
     * RuleConditionEvaluator's javadoc): a throwaway request shape, not a stored entity.
     */
    @PostMapping("/evaluate")
    @PreAuthorize("hasAuthority('rule:write')")
    public RuleConditionEvaluator.EvaluationOutcome evaluate(@RequestBody EvaluationRequest request) {
        return ruleConditionEvaluator.evaluate(request.conditions(), request.sampleEvent());
    }

    public record EvaluationRequest(RuleConditionGroup conditions, Event sampleEvent) {
    }
}
