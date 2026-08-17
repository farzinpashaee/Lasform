package com.csl.lasform.ingestion.geojson;

import java.util.List;

/** Standard GeoJSON FeatureCollection — a single reading is still wrapped as a one-element list. */
public record GeoJsonEventFeatureCollection(String type, List<GeoJsonEventFeature> features) {
}
