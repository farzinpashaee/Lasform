package com.lasform.business.specifications;

import com.lasform.model.dto.LocationDto;
import com.lasform.model.entity.Location;
import org.springframework.data.jpa.domain.Specification;

import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;

public class LocationSearchSpecifications implements Specification<Location> {

    LocationDto locationDto;

    public LocationSearchSpecifications(LocationDto locationDto){
        this.locationDto = locationDto;
    }

    @Override
    public Predicate toPredicate(Root<Location> root, CriteriaQuery<?> query, CriteriaBuilder builder) {
        return null;
    }

}
