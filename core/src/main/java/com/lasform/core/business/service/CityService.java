package com.lasform.core.business.service;

import com.lasform.core.business.repository.CityRepository;
import com.lasform.core.model.entity.City;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CityService {

    @Autowired
    CityRepository cityRepository;

    public List<City> getCityList(long stateId){
        return cityRepository.findAllByStateId( stateId );
    }

}
