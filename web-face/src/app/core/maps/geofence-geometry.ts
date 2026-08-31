import { Geofence } from '../models/geofence.model';
import { CircleShape, GeofenceShapeData, PolygonShape } from './map-provider.model';

/**
 * Conversion between GeofenceShapeData (lat/lng, what MapProvider speaks) and the backend
 * Geofence entity's GeoJSON fields (center/radiusMeters/boundary, [longitude, latitude] order).
 * Mirrors how Locations converts point.coordinates elsewhere in this app.
 */
export function shapeDataToGeofenceFields(
  shape: GeofenceShapeData,
): Pick<Geofence, 'shape' | 'center' | 'radiusMeters' | 'boundary'> {
  if (shape.shape === 'CIRCLE') {
    return {
      shape: 'CIRCLE',
      center: { type: 'Point', coordinates: [shape.center.lng, shape.center.lat] },
      radiusMeters: shape.radiusMeters,
    };
  }
  // GeoJSON polygons must be closed (first ring point repeated as the last) and are
  // conventionally wound counter-clockwise; the map providers hand back an open,
  // draw-order path, so both are normalized here.
  const ring = shape.path.map((point): [number, number] => [point.lng, point.lat]);
  if (ring.length > 0) {
    const [firstLng, firstLat] = ring[0];
    const [lastLng, lastLat] = ring[ring.length - 1];
    if (firstLng !== lastLng || firstLat !== lastLat) {
      ring.push([firstLng, firstLat]);
    }
  }
  return { shape: 'POLYGON', boundary: { type: 'Polygon', coordinates: [ring] } };
}

/** Returns null if the geofence has neither a usable center+radius nor a boundary ring. */
export function geofenceToShapeData(geofence: Geofence): GeofenceShapeData | null {
  if (geofence.shape === 'CIRCLE' && geofence.center && geofence.radiusMeters != null) {
    const [lng, lat] = geofence.center.coordinates;
    const circle: CircleShape = { shape: 'CIRCLE', center: { lat, lng }, radiusMeters: geofence.radiusMeters };
    return circle;
  }
  if (geofence.shape === 'POLYGON' && geofence.boundary) {
    const ring = geofence.boundary.coordinates[0] ?? [];
    // Drop the closing point GeoJSON requires — MapProvider paths are open.
    const openRing = ring.length > 1 ? ring.slice(0, -1) : ring;
    const polygon: PolygonShape = { shape: 'POLYGON', path: openRing.map(([lng, lat]) => ({ lat, lng })) };
    return polygon;
  }
  return null;
}
