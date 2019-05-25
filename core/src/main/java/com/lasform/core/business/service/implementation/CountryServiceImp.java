package com.lasform.core.business.service.implementation;

import com.lasform.core.business.repository.CountryRepository;
import com.lasform.core.business.service.CountryService;
import com.lasform.core.model.entity.Country;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CountryServiceImp implements CountryService {

    @Autowired
    CountryRepository countryRepository;

    public List<Country> getCountryList(){
        return countryRepository.findAll();
    }

}
