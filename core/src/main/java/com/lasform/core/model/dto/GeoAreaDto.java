package com.lasform.core.model.dto;

import com.lasform.core.C;
import lombok.Data;

import java.util.List;

@Data
public class GeoAreaDto {

    private long id;
    private String name;
    private String description;
    private C.GEO_AREA_TYPE type;
    private String areaString;
    private List<LatLng> areaList;
    private LatLng areaNortheast;
    private LatLng areaSouthwest;

}
