package com.csl.lasform.model.entity;

import java.util.HashMap;
import java.util.Map;

import com.csl.lasform.model.entity.enums.AlertSeverity;
import com.csl.lasform.model.entity.enums.RuleActionType;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * One action a {@link Rule} runs when its conditions match. Which fields apply depends on
 * {@link #type} — NOTIFICATION reads severity/message, WEBHOOK reads the webhookXxx fields; the
 * other group is simply unused. Cross-field requirements (e.g. a WEBHOOK action needs a
 * {@link #webhookUrl}) are checked in RuleServiceImpl rather than as Bean Validation annotations,
 * since jakarta.validation can't express "required only when type == X" declaratively.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode
@ToString
public class RuleAction {

    @NotNull(message = "{validation.ruleAction.type.required}")
    private RuleActionType type;

    // --- NOTIFICATION ---
    @Builder.Default
    private AlertSeverity severity = AlertSeverity.MEDIUM;

    /** Optional custom text; a default is generated from the rule/device name when blank. */
    private String message;

    // --- WEBHOOK ---
    private String webhookUrl;

    @Builder.Default
    private Map<String, String> webhookHeaders = new HashMap<>();

    /** Optional — when set, the request carries an X-Lasform-Signature HMAC-SHA256 header. */
    private String webhookSecret;
}
