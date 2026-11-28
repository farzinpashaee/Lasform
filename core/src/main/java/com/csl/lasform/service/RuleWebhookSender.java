package com.csl.lasform.service;

import com.csl.lasform.model.entity.Event;
import com.csl.lasform.model.entity.RuleAction;

/** Fires a rule's WEBHOOK action — see {@code RuleWebhookSenderImpl} for the actual HTTP call. */
public interface RuleWebhookSender {

    /** Never throws back to the caller — a failed delivery is logged, not propagated (see impl). */
    void sendAsync(RuleAction action, Event event);
}
