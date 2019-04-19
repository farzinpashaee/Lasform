package com.lasform.core.model.dto;

import lombok.Data;

@Data
public class RadiusSearchDto {

    private LatLng center;
    private long radius;

}
