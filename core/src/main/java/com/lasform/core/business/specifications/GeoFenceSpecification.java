package com.lasform.core.business.specifications;

import com.lasform.core.model.dto.GeoFenceDto;
import com.lasform.core.model.entity.GeoFence;
import org.springframework.data.jpa.domain.Specification;

import static org.springframework.data.jpa.domain.Specification.where;

public class GeoFenceSpecification {

    public Specification<GeoFence> search(GeoFenceDto geoFenceDto){
        return where(filterName(geoFenceDto))
                .and(filterDescription(geoFenceDto));
    }

    public Specification<GeoFence> filterName(GeoFenceDto geoFenceDto){
        return (root,query,cb) ->{
            if( geoFenceDto.getName() == null || geoFenceDto.getName().equals("") ) {
                return null;
            }
            return cb.like(root.get("name"), geoFenceDto.getName());
        };
    }

    public Specification<GeoFence> filterDescription(GeoFenceDto geoFenceDto){
        return (root,query,cb) ->{
            if( geoFenceDto.getDescription() == null || geoFenceDto.getDescription().equals("") ) {
                return null;
            }
            return cb.like(root.get("description"), geoFenceDto.getDescription());
        };
    }

}
