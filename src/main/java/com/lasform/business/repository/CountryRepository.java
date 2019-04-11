package com.lasform.business.repository;

import com.lasform.model.entity.Country;
import org.springframework.data.repository.CrudRepository;

import java.util.List;

@Repository
public interface CountryRepository extends CrudRepository<Country,Long> {

    List<Country> findAll();

}
