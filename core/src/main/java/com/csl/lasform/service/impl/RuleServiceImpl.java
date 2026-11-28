package com.csl.lasform.service.impl;

import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import com.csl.lasform.exception.BadRequestException;
import com.csl.lasform.model.entity.Rule;
import com.csl.lasform.model.entity.RuleAction;
import com.csl.lasform.model.entity.RuleCondition;
import com.csl.lasform.model.entity.enums.RuleActionType;
import com.csl.lasform.repository.RuleRepository;
import com.csl.lasform.service.RuleService;

@Service
@Validated
public class RuleServiceImpl extends AbstractCrudService<Rule, String> implements RuleService {

    /** Event fields a condition may address directly; anything else must be a "payload.*" path. */
    private static final Set<String> WHITELISTED_TOP_LEVEL_FIELDS =
            Set.of("type", "speed", "heading", "accuracy", "altitude");
    private static final String PAYLOAD_FIELD_PREFIX = "payload.";

    private final RuleRepository ruleRepository;

    public RuleServiceImpl(RuleRepository ruleRepository) {
        super(ruleRepository);
        this.ruleRepository = ruleRepository;
    }

    @Override
    public Rule create(Rule entity) {
        validate(entity);
        return super.create(entity);
    }

    @Override
    public Rule update(String id, Rule entity) {
        validate(entity);
        return super.update(id, entity);
    }

    @Override
    public List<Rule> findByOwnerId(String ownerId) {
        return ruleRepository.findByOwnerId(ownerId);
    }

    @Override
    protected void applyUpdate(Rule existing, Rule incoming) {
        existing.setName(incoming.getName());
        existing.setDescription(incoming.getDescription());
        existing.setEnabled(incoming.getEnabled());
        existing.setTriggerType(incoming.getTriggerType());
        existing.setTriggerDeviceId(incoming.getTriggerDeviceId());
        existing.setTriggerCategoryId(incoming.getTriggerCategoryId());
        existing.setConditions(incoming.getConditions());
        existing.setActions(incoming.getActions());
    }

    @Override
    protected String notFoundMessageCode() {
        return "error.rule.notFound";
    }

    /**
     * Checks the parts Bean Validation can't express declaratively: a condition's field must be
     * one of the whitelisted Event accessors or a "payload.*" path (otherwise it could never
     * match and the rule would silently never fire), and a WEBHOOK action needs a webhookUrl.
     */
    private void validate(Rule rule) {
        if (rule.getConditions() != null) {
            for (RuleCondition condition : rule.getConditions().getConditions()) {
                if (!isValidField(condition.getField())) {
                    throw new BadRequestException("error.rule.invalidConditionField", condition.getField());
                }
            }
        }
        for (RuleAction action : rule.getActions()) {
            if (action.getType() == RuleActionType.WEBHOOK
                    && (action.getWebhookUrl() == null || action.getWebhookUrl().isBlank())) {
                throw new BadRequestException("error.rule.webhookUrlRequired");
            }
        }
    }

    private boolean isValidField(String field) {
        return field != null && (WHITELISTED_TOP_LEVEL_FIELDS.contains(field) || field.startsWith(PAYLOAD_FIELD_PREFIX));
    }
}
