package com.csl.lasform.service;

import java.util.List;

import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Point;

import com.csl.lasform.model.entity.Location;

public interface LocationService extends CrudService<Location, String> {

    GeoResults<Location> findNear(Point point, Distance distance);

    List<Location> findByCategoryId(String categoryId);

    List<Location> findByTag(String tag);

    List<Location> findByTagsIn(List<String> tags);
}
