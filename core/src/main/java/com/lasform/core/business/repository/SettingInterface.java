package com.lasform.core.business.repository;

import com.lasform.core.model.entity.Setting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SettingInterface extends JpaRepository<Setting,Long> {

}
