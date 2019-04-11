package com.lasform.business.repository;

import com.lasform.model.entity.Geofence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GeofenceRepository extends JpaRepository<Geofence,Long> {


}
