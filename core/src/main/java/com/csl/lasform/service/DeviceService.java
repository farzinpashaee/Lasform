package com.csl.lasform.service;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.csl.lasform.model.entity.Device;
import com.csl.lasform.model.entity.enums.DeviceStatus;

public interface DeviceService extends CrudService<Device, String>, ImageAttachable {

    Device findByDeviceIdentifier(String deviceIdentifier);

    /** Paginated/sortable listing, optionally filtered by free-text {@code q} (name/identifier/tags), category, tags, and/or status. */
    Page<Device> search(String q, String categoryId, List<String> tags, DeviceStatus status, Pageable pageable);
}
