package com.csl.lasform.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.csl.lasform.model.entity.Rule;
import com.csl.lasform.model.entity.enums.RuleTriggerType;

public interface RuleRepository extends MongoRepository<Rule, String> {

    List<Rule> findByOwnerId(String ownerId);

    List<Rule> findByEnabledTrueAndTriggerTypeAndTriggerDeviceId(RuleTriggerType triggerType, String triggerDeviceId);

    List<Rule> findByEnabledTrueAndTriggerTypeAndTriggerCategoryIdIn(
            RuleTriggerType triggerType, Collection<String> triggerCategoryIds);
}
