package com.lasform.core.business.repository;

import com.lasform.core.model.entity.GeoFence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;


@Repository
public interface GeoFenceRepository extends JpaRepository<GeoFence,Long>, JpaSpecificationExecutor<GeoFence> {

    GeoFence findByName( String name );

}
