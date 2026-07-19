package com.csl.lasform.config;

import java.util.ArrayList;
import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.geo.Point;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.data.mongodb.core.geo.GeoJsonPolygon;

import tools.jackson.core.JsonParser;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.deser.std.StdDeserializer;
import tools.jackson.databind.module.SimpleModule;

/**
 * Spring Data's GeoJson* types have no default constructor, so Jackson can't
 * deserialize the {"type":"Point","coordinates":[...]} bodies they otherwise
 * serialize themselves as. Teach it how here instead of introducing separate
 * request DTOs solely for geo fields.
 */
@Configuration
public class GeoJsonJacksonConfig {

    @Bean
    public SimpleModule geoJsonJacksonModule() {
        SimpleModule module = new SimpleModule("geojson");
        module.addDeserializer(GeoJsonPoint.class, new GeoJsonPointDeserializer());
        module.addDeserializer(GeoJsonPolygon.class, new GeoJsonPolygonDeserializer());
        return module;
    }

    private static class GeoJsonPointDeserializer extends StdDeserializer<GeoJsonPoint> {

        GeoJsonPointDeserializer() {
            super(GeoJsonPoint.class);
        }

        @Override
        public GeoJsonPoint deserialize(JsonParser p, DeserializationContext ctxt) {
            JsonNode coordinates = ctxt.readTree(p).get("coordinates");
            return new GeoJsonPoint(coordinates.get(0).asDouble(), coordinates.get(1).asDouble());
        }
    }

    private static class GeoJsonPolygonDeserializer extends StdDeserializer<GeoJsonPolygon> {

        GeoJsonPolygonDeserializer() {
            super(GeoJsonPolygon.class);
        }

        @Override
        public GeoJsonPolygon deserialize(JsonParser p, DeserializationContext ctxt) {
            JsonNode outerRing = ctxt.readTree(p).get("coordinates").get(0);
            List<Point> points = new ArrayList<>();
            for (JsonNode coordinate : outerRing) {
                points.add(new Point(coordinate.get(0).asDouble(), coordinate.get(1).asDouble()));
            }
            return new GeoJsonPolygon(points);
        }
    }
}
