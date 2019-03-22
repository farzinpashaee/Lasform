package com.lasform.business.repository;

import com.lasform.model.entity.City;
import org.springframework.data.repository.CrudRepository;

import java.util.List;

public interface CityRepository extends CrudRepository<City,Long> {

    List<City> findAllByStateId( long stateId );

}
