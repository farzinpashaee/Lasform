package com.lasform.core.business.service;

import com.lasform.core.business.exceptions.EmptyFieldException;
import com.lasform.core.model.dto.PathDto;
import com.lasform.core.model.entity.Path;

import java.util.List;

public interface PathService {

    List<Path> getPathList();
    List<Path> search(PathDto pathDto);
    Path save(PathDto pathDto) throws EmptyFieldException;
    Path update(PathDto pathDto) throws EmptyFieldException;

}
