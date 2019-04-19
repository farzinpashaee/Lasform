package com.lasform.core.business.repository;

import com.lasform.core.model.entity.Country;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CountryRepository extends CrudRepository<Country,Long> {

    List<Country> findAll();

}
