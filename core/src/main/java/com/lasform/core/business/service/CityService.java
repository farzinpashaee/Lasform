package com.lasform.core.business.service;

import com.lasform.core.model.entity.City;

import java.util.List;

public interface CityService {
    List<City> getCityList(long stateId);
}
