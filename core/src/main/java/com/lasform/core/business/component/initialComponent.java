package com.lasform.core.business.component;

import com.lasform.core.business.repository.LocationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;

@Component
public class initialComponent {

    @Value("${lasform.application.initialData}")
    private boolean initialData = false;

    @Autowired
    LocationRepository locationRepository;

    @PostConstruct
    public void initialSampleData(){
        // Add sample data
        if(initialData){
            
        }
    }

}
