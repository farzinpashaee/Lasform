package com.csl.lasform.service.impl;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.csl.lasform.model.entity.Device;
import com.csl.lasform.model.entity.Event;
import com.csl.lasform.model.entity.Rule;
import com.csl.lasform.model.entity.enums.RuleTriggerType;
import com.csl.lasform.repository.RuleRepository;
import com.csl.lasform.service.FeatureFlag;
import com.csl.lasform.service.FeatureFlagService;
import com.csl.lasform.service.RuleActionExecutor;
import com.csl.lasform.service.RuleConditionEvaluator;
import com.csl.lasform.service.RuleEvaluationService;

@Service
public class RuleEvaluationServiceImpl implements RuleEvaluationService {

    private final RuleRepository ruleRepository;
    private final RuleConditionEvaluator ruleConditionEvaluator;
    private final RuleActionExecutor ruleActionExecutor;
    private final FeatureFlagService featureFlagService;

    public RuleEvaluationServiceImpl(
            RuleRepository ruleRepository,
            RuleConditionEvaluator ruleConditionEvaluator,
            RuleActionExecutor ruleActionExecutor,
            FeatureFlagService featureFlagService) {
        this.ruleRepository = ruleRepository;
        this.ruleConditionEvaluator = ruleConditionEvaluator;
        this.ruleActionExecutor = ruleActionExecutor;
        this.featureFlagService = featureFlagService;
    }

    @Override
    public void evaluate(Event event, Device device) {
        if (!featureFlagService.isEnabled(FeatureFlag.AUTOMATIONS)) {
            return;
        }
        for (Rule rule : rulesFor(device)) {
            if (ruleConditionEvaluator.evaluate(rule.getConditions(), event).matched()) {
                ruleActionExecutor.executeAll(rule, event, device);
            }
        }
    }

    private List<Rule> rulesFor(Device device) {
        List<Rule> rules = new ArrayList<>(
                ruleRepository.findByEnabledTrueAndTriggerTypeAndTriggerDeviceId(RuleTriggerType.DEVICE, device.getId()));
        if (device.getCategoryIds() != null && !device.getCategoryIds().isEmpty()) {
            rules.addAll(ruleRepository.findByEnabledTrueAndTriggerTypeAndTriggerCategoryIdIn(
                    RuleTriggerType.CATEGORY, device.getCategoryIds()));
        }
        return rules;
    }
}
