package com.lasform.core.business.service;

import com.lasform.core.business.repository.StateRepository;
import com.lasform.core.model.entity.State;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class StateService {

    @Autowired
    StateRepository stateRepository;

    public List<State> getStateList(long countryId){
        return stateRepository.findAllByCountryId( countryId );
    }
}
