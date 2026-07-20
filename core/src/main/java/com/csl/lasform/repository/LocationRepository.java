package com.csl.lasform.repository;

import java.util.List;

import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Point;
import org.springframework.data.mongodb.repository.MongoRepository;

import com.csl.lasform.model.entity.Location;

public interface LocationRepository extends MongoRepository<Location, String> {

    GeoResults<Location> findByPointNear(Point point, Distance distance);

    List<Location> findByCategoryIdsContaining(String categoryId);

    List<Location> findByTagsContaining(String tag);

    /** Locations having at least one of the given tags. */
    List<Location> findByTagsIn(List<String> tags);
}
