package com.lasform.core.business.repository;

import com.lasform.core.model.entity.State;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StateRepository extends CrudRepository<State,Long> {

    List<State> findAllByCountryId( long countryId );

}
