package com.lasform.core.business.service.implementation;

import com.lasform.core.business.exceptions.EmptyFieldException;
import com.lasform.core.business.repository.PathRepository;
import com.lasform.core.business.service.PathService;
import com.lasform.core.model.dto.PathDto;
import com.lasform.core.model.entity.Path;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

public class PathServiceImp implements PathService {

    @Autowired
    PathRepository pathRepository;

    @Override
    public List<Path> getPathList() {
        return pathRepository.findAll();
    }

    @Override
    public List<Path> search(PathDto pathDto) {
        return null;
    }

    @Override
    public Path save(PathDto pathDto) throws EmptyFieldException {
        Path path = new Path();
        if( pathDto.getName() == null && pathDto.getName()!=""){
            throw new EmptyFieldException();
        } else {
            path.setName(pathDto.getName());
        }
        path.setDescription(pathDto.getDescription());
        return pathRepository.save(path);
    }

    @Override
    public Path update(PathDto pathDto) throws EmptyFieldException {
        return null;
    }
}
