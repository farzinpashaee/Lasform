package com.csl.lasform.model.entity.enums;

public enum AlertType {
    GEOFENCE_ENTER,
    GEOFENCE_EXIT,
    DEVICE_OFFLINE,
    DEVICE_ONLINE,
    LOW_BATTERY,
    SPEED_LIMIT_EXCEEDED,
    SOS,
    TAMPER,
    CUSTOM,
    /** Fired by the rule engine — see {@link com.csl.lasform.model.entity.Rule}, Alert#ruleId. */
    RULE_TRIGGERED
}
