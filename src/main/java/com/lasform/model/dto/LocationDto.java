package com.lasform.model.dto;

import lombok.Data;

@Data
public class LocationDto {

    private long id;
    private String latitude;
    private String longitude;
    private String name;
    private String address;
    private long locationTypeId;
    private String locationTypeName;
    private long cityId;
    private String cityName;

}
