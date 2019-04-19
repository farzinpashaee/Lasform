package com.lasform.core.business.repository;

import com.lasform.core.model.entity.GeoArea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GeoAreaRepository extends JpaRepository<GeoArea,Long> {

    List<GeoArea> findByName( String name );
    List<GeoArea> findByNameContaining( String name );

}
