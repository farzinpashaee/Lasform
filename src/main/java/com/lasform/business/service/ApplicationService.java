package com.lasform.business.service;

import com.lasform.business.repository.SettingInterface;
import com.lasform.model.dto.LatLng;
import com.lasform.model.dto.SettingDto;
import com.lasform.model.entity.Setting;
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
        }
        return  settingDto;
    }

}
