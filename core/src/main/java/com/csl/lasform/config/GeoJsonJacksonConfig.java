package com.csl.lasform.config;

import java.util.ArrayList;
import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.geo.Point;
import org.springframework.data.mongodb.core.geo.GeoJsonLineString;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.data.mongodb.core.geo.GeoJsonPolygon;

import tools.jackson.core.JsonGenerator;
import tools.jackson.core.JsonParser;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.deser.std.StdDeserializer;
import tools.jackson.databind.module.SimpleModule;
import tools.jackson.databind.ser.std.StdSerializer;

/**
 * Spring Data's GeoJson* types have no default constructor, so Jackson can't
 * deserialize the {"type":"Point","coordinates":[...]} bodies they otherwise
 * serialize themselves as. Teach it how here instead of introducing separate
 * request DTOs solely for geo fields.
 *
 * <p>GeoJsonPolygon also needs a custom *serializer*: its default reflection-based
 * JSON is {@code coordinates: [{type:"LineString", coordinates:[{x,y},...]}]} (its
 * internal Java representation), not the standard GeoJSON
 * {@code coordinates: [[[lng,lat],...]]} — every polygon geofence round-tripped as
 * unparseable by clients expecting real GeoJSON. GeoJsonPoint doesn't need this: its
 * coordinates getter already returns a flat [x,y] list, so the default output is valid
 * GeoJSON (just with harmless extra x/y fields from the Point it extends).
 */
@Configuration
public class GeoJsonJacksonConfig {

    @Bean
    public SimpleModule geoJsonJacksonModule() {
        SimpleModule module = new SimpleModule("geojson");
        module.addDeserializer(GeoJsonPoint.class, new GeoJsonPointDeserializer());
        module.addDeserializer(GeoJsonPolygon.class, new GeoJsonPolygonDeserializer());
        module.addSerializer(GeoJsonPolygon.class, new GeoJsonPolygonSerializer());
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

    private static class GeoJsonPolygonSerializer extends StdSerializer<GeoJsonPolygon> {

        GeoJsonPolygonSerializer() {
            super(GeoJsonPolygon.class);
        }

        @Override
        public void serialize(GeoJsonPolygon value, JsonGenerator gen, SerializationContext ctxt) {
            gen.writeStartObject();
            gen.writeName("type");
            gen.writeString("Polygon");
            gen.writeName("coordinates");
            gen.writeStartArray();
            for (GeoJsonLineString ring : value.getCoordinates()) {
                gen.writeStartArray();
                for (Point point : ring.getCoordinates()) {
                    gen.writeStartArray();
                    gen.writeNumber(point.getX());
                    gen.writeNumber(point.getY());
                    gen.writeEndArray();
                }
                gen.writeEndArray();
            }
            gen.writeEndArray();
            gen.writeEndObject();
        }
    }
}
