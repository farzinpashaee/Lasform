package com.lasform.core.business.service;

import com.lasform.core.business.repository.CountryRepository;
import com.lasform.core.model.entity.Country;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CountryService {

    @Autowired
    CountryRepository countryRepository;

    public List<Country> getCountryList(){
        return countryRepository.findAll();
    }

}
