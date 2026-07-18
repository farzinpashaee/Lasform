package com.csl.lasform.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Point;
import org.springframework.data.mongodb.repository.MongoRepository;

import com.csl.lasform.model.entity.Location;

public interface LocationRepository extends MongoRepository<Location, String> {

    List<Location> findByDeviceIdOrderByRecordedAtDesc(String deviceId);

    Optional<Location> findFirstByDeviceIdOrderByRecordedAtDesc(String deviceId);

    List<Location> findByDeviceIdAndRecordedAtBetween(String deviceId, Instant from, Instant to);

    GeoResults<Location> findByPointNear(Point point, Distance distance);
}
