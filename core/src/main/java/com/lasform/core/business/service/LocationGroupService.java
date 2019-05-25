package com.lasform.core.business.service;

import com.lasform.core.business.exceptions.EmptyFieldException;
import com.lasform.core.business.exceptions.UnrecognizedLocationTypeException;
import com.lasform.core.model.dto.LocationGroupDto;
import com.lasform.core.model.entity.LocationGroup;

import java.util.List;

public interface LocationGroupService {
    List<LocationGroup> getLocationGroupList();
    LocationGroup save(LocationGroupDto locationGroupDto ) throws EmptyFieldException;
    LocationGroup update(LocationGroupDto locationGroupDto ) throws EmptyFieldException, UnrecognizedLocationTypeException;
}
