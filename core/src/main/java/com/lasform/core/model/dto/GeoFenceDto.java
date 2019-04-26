package com.lasform.core.model.dto;

import com.lasform.core.C;
import lombok.Data;

@Data
public class GeoFenceDto {

    private long id;
    private String name;
    private String description;
    private C.GEO_AREA_TYPE type;
    private GeoAreaDto geoAreaDto;

}
