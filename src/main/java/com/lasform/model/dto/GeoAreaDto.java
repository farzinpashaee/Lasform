package com.lasform.model.dto;

import com.lasform.C;
import lombok.Data;

import java.util.List;

@Data
public class GeoAreaDto {

    private long id;
    private String name;
    private String description;
    private C.GEOFENCE_TYPE type;
    private String areaString;
    private List<LatLng> areaList;
    private LatLng areaNortheast;
    private LatLng areaSouthwest;

}
