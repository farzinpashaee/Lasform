package com.csl.lasform.service;

import com.csl.lasform.model.entity.Device;
import com.csl.lasform.model.entity.Event;
import com.csl.lasform.model.entity.Rule;

/** Runs every action of a {@link Rule} whose conditions just matched — see {@code RuleEvaluationService}. */
public interface RuleActionExecutor {

    /**
     * Runs {@code rule}'s actions in order. One action's failure is caught and logged — it never
     * blocks a sibling action, and never propagates back into event ingestion.
     */
    void executeAll(Rule rule, Event event, Device device);
}
