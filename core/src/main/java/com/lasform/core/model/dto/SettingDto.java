package com.lasform.core.model.dto;

import lombok.Data;

@Data
public class SettingDto {

    private LatLng initialMapCenter;
    private boolean userLocationPolicy;

}
