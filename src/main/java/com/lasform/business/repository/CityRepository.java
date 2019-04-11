package com.lasform.business.repository;

import com.lasform.model.entity.City;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CityRepository extends CrudRepository<City,Long> {

    List<City> findAllByStateId( long stateId );

}
