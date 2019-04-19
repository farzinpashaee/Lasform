package com.lasform.core.model.dto;

import com.lasform.core.C;
import lombok.Data;

@Data
public class GeofenceDto {

    private long id;
    private String name;
    private String description;
    private C.GEOFENCE_TYPE type;
    private GeoAreaDto geoAreaDto;

}
