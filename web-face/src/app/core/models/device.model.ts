import { Auditable } from './auditable.model';
import { DeviceStatus, DeviceType } from './enums';
import { GeoJsonPoint } from './geo.model';

export interface Device extends Auditable {
  id?: string;
  /** System-generated on create (see core/README.md) — never supplied by the client, only ever read back or refreshed via regenerateIdentifier. */
  deviceIdentifier?: string;
  name: string;
  type: DeviceType;
  status?: DeviceStatus;
  lastKnownPoint?: GeoJsonPoint;
  lastSeenAt?: string;
  batteryLevel?: number;
  categoryIds?: string[];
  tags?: string[];
  metadata?: Record<string, string>;
  version?: number;
}
