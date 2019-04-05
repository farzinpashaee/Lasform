package com.lasform.model.dto;

import com.lasform.C;
import com.lasform.model.entity.GeoArea;
import lombok.Data;

@Data
public class GeofenceDto {

    private long id;
    private String name;
    private String description;
    private C.GEOFENCE_TYPE type;
    private GeoAreaDto geoAreaDto;

}
