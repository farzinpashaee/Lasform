package com.lasform.business.repository;

import com.lasform.model.entity.LocationGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LocationGroupRepository extends JpaRepository<LocationGroup,Long> {
}
