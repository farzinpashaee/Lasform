package com.lasform.core.business.service;

import com.lasform.core.business.repository.SettingInterface;
import com.lasform.core.model.dto.LatLng;
import com.lasform.core.model.dto.SettingDto;
import com.lasform.core.model.entity.Setting;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ApplicationService {

    @Autowired
    SettingInterface settingInterface;

    public SettingDto getInitialSetting(){
        SettingDto settingDto = new SettingDto();
        Setting setting = settingInterface.findById( new Long(1) ).get();
        if( setting != null ){
            String[] center = setting.getInitialMapCenter().split(",");
            settingDto.setInitialMapCenter( new LatLng(center[0],center[1]) );
            settingDto.setUserLocationPolicy( setting.isUserLocationPolicy() );
        }
        return  settingDto;
    }

}
