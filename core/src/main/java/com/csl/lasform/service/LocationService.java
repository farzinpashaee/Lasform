package com.csl.lasform.service;

import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Point;

import com.csl.lasform.model.entity.Location;

public interface LocationService extends CrudService<Location, String> {

    GeoResults<Location> findNear(Point point, Distance distance);
}
