package com.csl.lasform.service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Point;

import com.csl.lasform.model.entity.Location;

public interface LocationService extends CrudService<Location, String> {

    List<Location> findByDeviceIdOrderByRecordedAtDesc(String deviceId);

    Optional<Location> findLatestByDeviceId(String deviceId);

    List<Location> findByDeviceIdAndRecordedAtBetween(String deviceId, Instant from, Instant to);

    GeoResults<Location> findNear(Point point, Distance distance);
}
