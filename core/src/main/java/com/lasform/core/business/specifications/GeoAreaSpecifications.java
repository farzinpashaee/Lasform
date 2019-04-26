package com.lasform.core.business.specifications;


import com.lasform.core.C;
import com.lasform.core.model.dto.GeoAreaDto;
import com.lasform.core.model.entity.GeoArea;
import org.springframework.data.jpa.domain.Specification;

import static org.springframework.data.jpa.domain.Specification.where;

public class GeoAreaSpecifications {

    public Specification<GeoArea> search(GeoAreaDto geoAreaDto){
        return where(filterName(geoAreaDto))
                .and(filterDescription(geoAreaDto));
    }

    public Specification<GeoArea> filterName(GeoAreaDto geoAreaDto){
        return (root,query,cb) ->{
            if( geoAreaDto.getName() == null || geoAreaDto.getName().equals("") ) {
                return null;
            }
            return cb.like(root.get("name"), geoAreaDto.getName());
        };
    }

    public Specification<GeoArea> filterDescription(GeoAreaDto geoAreaDto){
        return (root,query,cb) ->{
            if( geoAreaDto.getDescription() == null || geoAreaDto.getDescription().equals("") ) {
                return null;
            }
            return cb.like(root.get("description"), geoAreaDto.getDescription());
        };
    }

    public Specification<GeoArea> filterType(GeoAreaDto geoAreaDto){
        return (root,query,cb) ->{
            if( geoAreaDto.getType() == null || geoAreaDto.getType() == C.GEO_AREA_TYPE.UNKNOWN ) {
                return null;
            }
            return cb.equal(root.get("type"), geoAreaDto.getType());
        };
    }
}
