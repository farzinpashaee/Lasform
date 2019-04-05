package com.lasform.business.repository;

import com.lasform.model.entity.GeoArea;
import com.lasform.model.entity.Geofence;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GeoAreaRepository extends JpaRepository<GeoArea,Long> {



}
