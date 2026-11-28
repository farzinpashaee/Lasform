package com.csl.lasform.service.impl;

import org.springframework.stereotype.Service;

import com.csl.lasform.model.entity.Alert;
import com.csl.lasform.model.entity.Device;
import com.csl.lasform.model.entity.Event;
import com.csl.lasform.model.entity.Rule;
import com.csl.lasform.model.entity.RuleAction;
import com.csl.lasform.model.entity.enums.AlertStatus;
import com.csl.lasform.model.entity.enums.AlertType;
import com.csl.lasform.model.entity.enums.RuleActionType;
import com.csl.lasform.service.AlertService;
import com.csl.lasform.service.RuleActionExecutor;
import com.csl.lasform.service.RuleWebhookSender;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class RuleActionExecutorImpl implements RuleActionExecutor {

    private final AlertService alertService;
    private final RuleWebhookSender ruleWebhookSender;

    public RuleActionExecutorImpl(AlertService alertService, RuleWebhookSender ruleWebhookSender) {
        this.alertService = alertService;
        this.ruleWebhookSender = ruleWebhookSender;
    }

    @Override
    public void executeAll(Rule rule, Event event, Device device) {
        for (RuleAction action : rule.getActions()) {
            try {
                executeOne(rule, event, device, action);
            } catch (RuntimeException e) {
                log.warn(
                        "Rule action {} for rule '{}' ({}) failed for event {}: {}",
                        action.getType(), rule.getName(), rule.getId(), event.getId(), e.getMessage(), e);
            }
        }
    }

    private void executeOne(Rule rule, Event event, Device device, RuleAction action) {
        if (action.getType() == RuleActionType.NOTIFICATION) {
            notify(rule, event, device, action);
        } else if (action.getType() == RuleActionType.WEBHOOK) {
            ruleWebhookSender.sendAsync(action, event);
        }
    }

    private void notify(Rule rule, Event event, Device device, RuleAction action) {
        String message = action.getMessage() != null && !action.getMessage().isBlank()
                ? action.getMessage()
                : "Rule '" + rule.getName() + "' triggered for device '" + device.getName() + "'";
        Alert alert = Alert.builder()
                .deviceId(device.getId())
                .ruleId(rule.getId())
                .sourceEventId(event.getId())
                .type(AlertType.RULE_TRIGGERED)
                .severity(action.getSeverity())
                .status(AlertStatus.NEW)
                .message(message)
                .triggerPoint(event.getPoint())
                .triggeredAt(event.getOccurredAt())
                .build();
        alertService.create(alert);
    }
}
