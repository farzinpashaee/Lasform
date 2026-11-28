package com.csl.lasform.model.entity.enums;

/**
 * How a {@link com.csl.lasform.model.entity.RuleCondition#getValue()} is compared against the
 * resolved event field — see {@code RuleConditionEvaluator} for the exact coercion rules per
 * operator (numeric vs string comparison, list membership, etc).
 */
public enum RuleOperator {
    EQ,
    NE,
    GT,
    GTE,
    LT,
    LTE,
    CONTAINS,
    EXISTS,
    NOT_EXISTS
}
