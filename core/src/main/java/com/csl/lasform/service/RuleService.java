package com.csl.lasform.service;

import java.util.List;

import com.csl.lasform.model.entity.Rule;

public interface RuleService extends CrudService<Rule, String> {

    List<Rule> findByOwnerId(String ownerId);
}
