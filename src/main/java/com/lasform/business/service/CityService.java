package com.lasform.business.service;

import com.lasform.business.repository.CityRepository;
import com.lasform.model.entity.City;
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
