package com.lasform.business.service;

import com.lasform.business.repository.StateRepository;
import com.lasform.model.entity.City;
import com.lasform.model.entity.State;
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
