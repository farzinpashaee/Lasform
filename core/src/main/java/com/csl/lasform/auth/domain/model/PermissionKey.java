package com.csl.lasform.auth.domain.model;

/**
 * The fixed, code-defined catalog of permission keys — the single source of truth {@link
 * Permission} rows are seeded from (see {@code AuthSeeder}). Never exposed for mutation via API:
 * adding a capability means adding a constant here, not an admin-facing endpoint. The rest of the
 * app should reference these constants rather than string literals.
 */
public enum PermissionKey {
    DEVICE_READ("device:read", "View devices"),
    DEVICE_WRITE("device:write", "Create and update devices"),
    DEVICE_DELETE("device:delete", "Delete devices"),

    LOCATION_READ("location:read", "View locations"),
    LOCATION_WRITE("location:write", "Create and update locations"),
    LOCATION_DELETE("location:delete", "Delete locations"),

    GEOFENCE_READ("geofence:read", "View geofences"),
    GEOFENCE_WRITE("geofence:write", "Create and update geofences"),
    GEOFENCE_DELETE("geofence:delete", "Delete geofences"),

    EVENT_READ("event:read", "View events"),
    EVENT_WRITE("event:write", "Update and delete events"),

    USER_READ("user:read", "View users"),
    USER_INVITE("user:invite", "Invite new users"),
    USER_MANAGE_ROLES("user:manage_roles", "Assign or revoke roles on a user"),
    USER_DISABLE("user:disable", "Disable or re-enable a user"),

    ROLE_MANAGE("role:manage", "Create, update, and delete roles and their permission bundles"),

    MAP_VIEW_PUBLIC("map:view_public", "View the public map without authenticating");

    private final String key;
    private final String description;

    PermissionKey(String key, String description) {
        this.key = key;
        this.description = description;
    }

    public String key() {
        return key;
    }

    public String description() {
        return description;
    }
}
