package com.lasform.business.repository;

import com.lasform.model.entity.GeoArea;
import com.lasform.model.entity.Geofence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GeoAreaRepository extends JpaRepository<GeoArea,Long> {

    List<GeoArea> findByName( String name );
    List<GeoArea> findByNameContaining( String name );

}
