import { Auditable } from './auditable.model';
import { GeofenceShape, GeofenceStatus } from './enums';
import { GeoJsonPoint, GeoJsonPolygon } from './geo.model';

export interface Geofence extends Auditable {
  id?: string;
  name: string;
  description?: string;
  ownerId: string;
  shape: GeofenceShape;
  /** Set when shape is CIRCLE, together with radiusMeters. */
  center?: GeoJsonPoint;
  radiusMeters?: number;
  /** Set when shape is POLYGON. */
  boundary?: GeoJsonPolygon;
  status?: GeofenceStatus;
  /** Devices this geofence applies to; empty means it applies to all of the owner's devices. */
  deviceIds?: string[];
  version?: number;
}
