import { Auditable } from './auditable.model';
import { DeviceStatus, DeviceType } from './enums';
import { GeoJsonPoint } from './geo.model';

export interface Device extends Auditable {
  id?: string;
  deviceIdentifier: string;
  name: string;
  ownerId: string;
  type: DeviceType;
  status?: DeviceStatus;
  lastKnownPoint?: GeoJsonPoint;
  lastSeenAt?: string;
  batteryLevel?: number;
  metadata?: Record<string, string>;
  version?: number;
}
