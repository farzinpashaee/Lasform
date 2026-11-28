import { Auditable } from './auditable.model';
import { AlertSeverity, AlertStatus, AlertType } from './enums';
import { GeoJsonPoint } from './geo.model';

export interface Alert extends Auditable {
  id?: string;
  deviceId: string;
  /** Set only for geofence-triggered alerts. */
  geofenceId?: string;
  /** Set only for rule-triggered alerts (type === 'RULE_TRIGGERED') — see Rule. */
  ruleId?: string;
  /** The Event#id that caused this alert to fire, if any. */
  sourceEventId?: string;
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
