package com.lasform.business.service;

import com.lasform.business.repository.CountryRepository;
import com.lasform.model.entity.Country;
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
