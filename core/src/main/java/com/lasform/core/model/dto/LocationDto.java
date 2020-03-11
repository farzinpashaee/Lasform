package com.lasform.core.model.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@ApiModel("Location data transfer object")
public class LocationDto {

    private long id;
    private String latitude;
    private String longitude;
    @ApiModelProperty("Name can not be empty")
    private String name;
    private String address;
    private long locationTypeId;
    private String locationTypeName;
    private long cityId;
    private String cityName;
    private long locationGroupId;
    private String locationGroupName;

}
