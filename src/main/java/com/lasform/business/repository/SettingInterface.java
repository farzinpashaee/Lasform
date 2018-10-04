package com.lasform.business.repository;

import com.lasform.model.entity.Setting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SettingInterface extends JpaRepository<Setting,Long> {

}
