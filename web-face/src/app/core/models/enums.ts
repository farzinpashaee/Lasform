export type UserStatus = 'ACTIVE' | 'DISABLED';

export type DeviceType = 'GPS_TRACKER' | 'MOBILE_PHONE' | 'VEHICLE_UNIT' | 'WEARABLE' | 'IOT_SENSOR' | 'OTHER';

export type DeviceStatus = 'ACTIVE' | 'INACTIVE' | 'OFFLINE' | 'MAINTENANCE' | 'DECOMMISSIONED';

export type GeofenceShape = 'CIRCLE' | 'POLYGON';

export type GeofenceStatus = 'ACTIVE' | 'INACTIVE';

export type AlertType =
  | 'GEOFENCE_ENTER'
  | 'GEOFENCE_EXIT'
  | 'DEVICE_OFFLINE'
  | 'DEVICE_ONLINE'
  | 'LOW_BATTERY'
  | 'SPEED_LIMIT_EXCEEDED'
  | 'SOS'
  | 'TAMPER'
  | 'CUSTOM'
  | 'RULE_TRIGGERED';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';

export type EventType =
  | 'DEVICE_REGISTERED'
  | 'DEVICE_UPDATED'
  | 'DEVICE_DELETED'
  | 'LOCATION_RECEIVED'
  | 'GEOFENCE_CREATED'
  | 'GEOFENCE_UPDATED'
  | 'GEOFENCE_DELETED'
  | 'ALERT_TRIGGERED'
  | 'ALERT_ACKNOWLEDGED'
  | 'ALERT_RESOLVED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_CREATED'
  | 'SYSTEM_ERROR'
  | 'OTHER';

export type EventSource = 'DEVICE' | 'USER' | 'SYSTEM';

export type PhoneNumberType = 'MOBILE' | 'LANDLINE' | 'FAX' | 'WHATSAPP' | 'TOLL_FREE' | 'OTHER';

export type RuleTriggerType = 'DEVICE' | 'CATEGORY';

export type RuleLogicalOperator = 'AND' | 'OR';

export type RuleOperator = 'EQ' | 'NE' | 'GT' | 'GTE' | 'LT' | 'LTE' | 'CONTAINS' | 'EXISTS' | 'NOT_EXISTS';

export type RuleActionType = 'NOTIFICATION' | 'WEBHOOK';
