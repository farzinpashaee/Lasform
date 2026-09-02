package com.csl.lasform.controller;

import com.csl.lasform.model.entity.enums.DeviceStatus;

/**
 * Minimal, non-sensitive confirmation that a device identifier is registered — returned to
 * anonymous callers (see {@code DeviceController#validateByIdentifier}), so it deliberately omits
 * everything else on {@link com.csl.lasform.model.entity.Device} (name, tags, images, location...).
 */
public record DeviceValidationResponse(String deviceIdentifier, DeviceStatus status) {
}
