package com.csl.lasform.service;

import java.util.List;

import com.csl.lasform.model.entity.Device;
import com.csl.lasform.model.entity.enums.DeviceStatus;

public interface DeviceService extends CrudService<Device, String> {

    Device findByDeviceIdentifier(String deviceIdentifier);

    List<Device> findByOwnerId(String ownerId);

    List<Device> findByStatus(DeviceStatus status);

    List<Device> findByTag(String tag);

    List<Device> findByTagsIn(List<String> tags);
}
