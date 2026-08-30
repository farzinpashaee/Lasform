package com.csl.lasform.repository;

import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Point;
import org.springframework.data.mongodb.repository.MongoRepository;

import com.csl.lasform.model.entity.Location;

public interface LocationRepository extends MongoRepository<Location, String> {

    GeoResults<Location> findByPointNear(Point point, Distance distance);
}
