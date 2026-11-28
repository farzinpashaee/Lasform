package com.csl.lasform.service;

import com.csl.lasform.model.entity.Device;
import com.csl.lasform.model.entity.Event;

/** Entry point called from EventIngestionService once an Event's Device is resolved. */
public interface RuleEvaluationService {

    /** Looks up this device's/category's enabled rules, runs their conditions, and executes matches' actions. */
    void evaluate(Event event, Device device);
}
