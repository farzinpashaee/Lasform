package com.csl.lasform.model.entity;

import java.util.ArrayList;
import java.util.List;

import com.csl.lasform.model.entity.enums.RuleLogicalOperator;

import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * A rule's single, flat set of conditions — deliberately not a recursive tree of groups (see
 * Rule's own javadoc): every {@link #conditions} entry combines with every other the same way,
 * per {@link #operator}. An empty list matches unconditionally (a trigger-only rule).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode
@ToString
public class RuleConditionGroup {

    @Builder.Default
    private RuleLogicalOperator operator = RuleLogicalOperator.AND;

    @Valid
    @Builder.Default
    private List<RuleCondition> conditions = new ArrayList<>();
}
