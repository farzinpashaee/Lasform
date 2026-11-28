package com.csl.lasform.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.OptionalDouble;

import org.springframework.stereotype.Component;

import com.csl.lasform.model.entity.Event;
import com.csl.lasform.model.entity.RuleCondition;
import com.csl.lasform.model.entity.RuleConditionGroup;
import com.csl.lasform.model.entity.enums.RuleLogicalOperator;
import com.csl.lasform.model.entity.enums.RuleOperator;

/**
 * Evaluates a {@link RuleConditionGroup} against an {@link Event} — stateless, no entity/service
 * dependency, so it's equally usable from the live ingestion hot path (RuleEvaluationService) and
 * the throwaway {@code /rules/evaluate} preview endpoint.
 *
 * <p>Field resolution never throws: a missing payload path, a non-Map intermediate segment, or an
 * explicit null all resolve to "absent" — EXISTS is false, NOT_EXISTS is true, every other
 * operator is false. One bad/missing field just fails that one condition, never the whole batch.
 */
@Component
public class RuleConditionEvaluator {

    private static final String PAYLOAD_PREFIX = "payload.";

    public EvaluationOutcome evaluate(RuleConditionGroup group, Event event) {
        List<RuleCondition> conditions = group == null ? List.of() : group.getConditions();
        if (conditions == null || conditions.isEmpty()) {
            return new EvaluationOutcome(true, List.of());
        }
        List<ConditionResult> results = new ArrayList<>(conditions.size());
        for (RuleCondition condition : conditions) {
            results.add(new ConditionResult(condition, evaluateCondition(condition, event)));
        }
        boolean matched = group.getOperator() == RuleLogicalOperator.OR
                ? results.stream().anyMatch(ConditionResult::matched)
                : results.stream().allMatch(ConditionResult::matched);
        return new EvaluationOutcome(matched, results);
    }

    private boolean evaluateCondition(RuleCondition condition, Event event) {
        Optional<Object> resolved = resolveField(condition.getField(), event);
        RuleOperator operator = condition.getOperator();
        if (operator == RuleOperator.EXISTS) {
            return resolved.isPresent();
        }
        if (operator == RuleOperator.NOT_EXISTS) {
            return resolved.isEmpty();
        }
        if (resolved.isEmpty()) {
            return false;
        }
        Object actual = resolved.get();
        Object expected = condition.getValue();
        return switch (operator) {
            case EQ -> compareEquality(actual, expected);
            case NE -> !compareEquality(actual, expected);
            case GT, GTE, LT, LTE -> compareOrdering(actual, expected, operator);
            case CONTAINS -> evaluateContains(actual, expected);
            case EXISTS, NOT_EXISTS -> throw new IllegalStateException("handled above");
        };
    }

    /** "type"/"speed"/"heading"/"accuracy"/"altitude" read Event's own accessors; anything else must be "payload.*". */
    private Optional<Object> resolveField(String field, Event event) {
        if (field == null) {
            return Optional.empty();
        }
        if (field.startsWith(PAYLOAD_PREFIX)) {
            return resolvePayloadPath(event.getPayload(), field.substring(PAYLOAD_PREFIX.length()));
        }
        Object value = switch (field) {
            case "type" -> event.getType();
            case "speed" -> event.getSpeed();
            case "heading" -> event.getHeading();
            case "accuracy" -> event.getAccuracy();
            case "altitude" -> event.getAltitude();
            default -> null;
        };
        return Optional.ofNullable(value);
    }

    private Optional<Object> resolvePayloadPath(Map<String, Object> payload, String dotPath) {
        if (payload == null || dotPath.isEmpty()) {
            return Optional.empty();
        }
        Object current = payload;
        for (String segment : dotPath.split("\\.")) {
            if (!(current instanceof Map<?, ?> map)) {
                return Optional.empty();
            }
            current = map.get(segment);
            if (current == null) {
                return Optional.empty();
            }
        }
        return Optional.of(current);
    }

    /** Numeric equality when both sides parse as numbers, otherwise a plain string comparison. */
    private boolean compareEquality(Object actual, Object expected) {
        OptionalDouble actualNumber = toDouble(actual);
        OptionalDouble expectedNumber = toDouble(expected);
        if (actualNumber.isPresent() && expectedNumber.isPresent()) {
            return Double.compare(actualNumber.getAsDouble(), expectedNumber.getAsDouble()) == 0;
        }
        return Objects.equals(String.valueOf(actual), String.valueOf(expected));
    }

    /** GT/GTE/LT/LTE only make sense numerically — false (never throws) when either side isn't a number. */
    private boolean compareOrdering(Object actual, Object expected, RuleOperator operator) {
        OptionalDouble actualNumber = toDouble(actual);
        OptionalDouble expectedNumber = toDouble(expected);
        if (actualNumber.isEmpty() || expectedNumber.isEmpty()) {
            return false;
        }
        int comparison = Double.compare(actualNumber.getAsDouble(), expectedNumber.getAsDouble());
        return switch (operator) {
            case GT -> comparison > 0;
            case GTE -> comparison >= 0;
            case LT -> comparison < 0;
            case LTE -> comparison <= 0;
            default -> false;
        };
    }

    private boolean evaluateContains(Object actual, Object expected) {
        if (expected == null) {
            return false;
        }
        if (actual instanceof String actualString) {
            return actualString.toLowerCase(Locale.ROOT).contains(String.valueOf(expected).toLowerCase(Locale.ROOT));
        }
        if (actual instanceof List<?> list) {
            String target = String.valueOf(expected);
            return list.stream().anyMatch(item -> Objects.equals(String.valueOf(item), target));
        }
        return false;
    }

    private OptionalDouble toDouble(Object value) {
        if (value instanceof Number number) {
            return OptionalDouble.of(number.doubleValue());
        }
        if (value instanceof String string) {
            try {
                return OptionalDouble.of(Double.parseDouble(string));
            } catch (NumberFormatException e) {
                return OptionalDouble.empty();
            }
        }
        return OptionalDouble.empty();
    }

    public record ConditionResult(RuleCondition condition, boolean matched) {
    }

    public record EvaluationOutcome(boolean matched, List<ConditionResult> conditionResults) {
    }
}
