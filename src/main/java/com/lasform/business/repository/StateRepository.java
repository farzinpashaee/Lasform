package com.lasform.business.repository;

import com.lasform.model.entity.State;
import org.springframework.data.repository.CrudRepository;

import java.util.List;

public interface StateRepository extends CrudRepository<State,Long> {

    List<State> findAllByCountryId( long countryId );

}
