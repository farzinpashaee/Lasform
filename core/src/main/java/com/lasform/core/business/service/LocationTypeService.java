package com.lasform.core.business.service;

import com.lasform.core.business.exceptions.EmptyFieldException;
import com.lasform.core.business.exceptions.UnrecognizedLocationTypeException;
import com.lasform.core.model.dto.LocationTypeDto;
import com.lasform.core.model.entity.LocationType;

import java.util.List;

public interface LocationTypeService {
    List<LocationType> getLocationTypeList();
    LocationType save(LocationTypeDto locationTypeDto ) throws EmptyFieldException;
    LocationType update(LocationTypeDto locationTypeDto ) throws EmptyFieldException, UnrecognizedLocationTypeException;
}
