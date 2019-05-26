package com.lasform.core.business.service;

import com.lasform.core.model.entity.State;

import java.util.List;

public interface StateService {
    public List<State> getStateList(long countryId);
}
