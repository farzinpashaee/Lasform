package com.lasform.core.business.repository;

import com.lasform.core.model.entity.LocationGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LocationGroupRepository extends JpaRepository<LocationGroup,Long> {
}
