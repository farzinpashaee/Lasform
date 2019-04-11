package com.lasform.business.repository;

import com.lasform.model.entity.Setting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SettingInterface extends JpaRepository<Setting,Long> {

}
