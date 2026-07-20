import { EventSource, EventType } from './enums';
import { GeoJsonPoint } from './geo.model';

/** Not Auditable on the backend — Event is append-only, so it only carries createdAt. */
export interface Event {
  id?: string;
  type: EventType;
  source: EventSource;
  deviceId?: string;
  userId?: string;
  speed?: number;
  heading?: number;
  accuracy?: number;
  altitude?: number;
  point: GeoJsonPoint;
  payload?: Record<string, unknown>;
  occurredAt: string;
  createdAt?: string;
}
