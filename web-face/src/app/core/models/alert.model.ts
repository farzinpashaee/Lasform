import { Auditable } from './auditable.model';
import { AlertSeverity, AlertStatus, AlertType } from './enums';
import { GeoJsonPoint } from './geo.model';

export interface Alert extends Auditable {
  id?: string;
  deviceId: string;
  /** Set only for geofence-triggered alerts. */
  geofenceId?: string;
  type: AlertType;
  severity?: AlertSeverity;
  status?: AlertStatus;
  message?: string;
  triggerPoint?: GeoJsonPoint;
  triggeredAt: string;
  acknowledgedAt?: string;
  acknowledgedByUserId?: string;
  resolvedAt?: string;
}
