import { Address } from './address.model';
import { Auditable } from './auditable.model';
import { GeoJsonPoint } from './geo.model';

export interface Location extends Auditable {
  id?: string;
  point: GeoJsonPoint;
  name?: string;
  description?: string;
  altitude?: number;
  address?: Address;
  recordedAt: string;
  receivedAt?: string;
  metadata?: Record<string, unknown>;
}
