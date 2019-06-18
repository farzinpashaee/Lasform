package com.lasform.core.business.component;

import com.lasform.core.business.exceptions.UnrecognizedCityException;
import com.lasform.core.business.exceptions.UnrecognizedLocationTypeException;
import com.lasform.core.business.service.LocationService;
import com.lasform.core.model.dto.LocationDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jms.annotation.JmsListener;
import org.springframework.stereotype.Component;

@Component
public class LocationComponent {

    @Autowired
    private LocationService locationService;

    @JmsListener(destination = "addLocationQueue", containerFactory = "locationAddFactory")
    public void receiveLocationMessage(LocationDto locationDto) {
        try {
            locationService.save(locationDto);
        } catch (UnrecognizedCityException e) {
            e.printStackTrace();
        } catch (UnrecognizedLocationTypeException e) {
            e.printStackTrace();
        }
    }



}
