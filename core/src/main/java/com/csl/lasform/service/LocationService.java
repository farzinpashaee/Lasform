package com.csl.lasform.service;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Point;

import com.csl.lasform.model.entity.Location;

public interface LocationService extends CrudService<Location, String>, ImageAttachable {

    GeoResults<Location> findNear(Point point, Distance distance);

    /** Paginated/sortable listing, optionally filtered by free-text {@code q} (name/description/tags), category, and/or tags. */
    Page<Location> search(String q, String categoryId, List<String> tags, Pageable pageable);

    /**
     * Every Location whose point falls within the given lon/lat rectangle, capped at {@code limit} — backs the
     * map's viewport-based marker loading (reloaded on pan/zoom instead of fetching the whole collection).
     */
    List<Location> findWithinBounds(double west, double south, double east, double north, int limit);
}
