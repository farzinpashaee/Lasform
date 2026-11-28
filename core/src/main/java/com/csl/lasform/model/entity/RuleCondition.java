package com.csl.lasform.model.entity;

import com.csl.lasform.model.entity.enums.RuleOperator;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * One condition inside a {@link RuleConditionGroup}. {@link #field} is either one of Event's
 * whitelisted top-level accessors ("type", "speed", "heading", "accuracy", "altitude") or a
 * {@code payload.<dot.path>} walked through Event#payload — see RuleServiceImpl for the
 * whitelist check and RuleConditionEvaluator for how a field resolves and compares.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode
@ToString
public class RuleCondition {

    @NotBlank(message = "{validation.ruleCondition.field.required}")
    private String field;

    @NotNull(message = "{validation.ruleCondition.operator.required}")
    private RuleOperator operator;

    /** Omitted/ignored for EXISTS and NOT_EXISTS. */
    private Object value;
}
