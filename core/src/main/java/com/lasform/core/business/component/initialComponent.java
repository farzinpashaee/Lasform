package com.lasform.core.business.component;

import com.lasform.core.business.repository.*;
import com.lasform.core.model.entity.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.List;

@Component
public class initialComponent {

    @Value("${lasform.application.initialSampleData}")
    private boolean initialData = false;

    @Autowired
    LocationRepository locationRepository;

    @Autowired
    CountryRepository countryRepository;

    @Autowired
    StateRepository stateRepository;

    @Autowired
    CityRepository cityRepository;

    @Autowired
    LocationTypeRepository locationTypeRepository;

    @PostConstruct
    public void initialSampleData(){
        // Add sample data
        if(initialData){

            Country country = new Country();
            country.setName("Iran");
            country.setCode("IR");
            countryRepository.save(country);

            State state = new State();
            state.setCountry(country);
            state.setName("Tehran");
            state.setCode("TH");
            stateRepository.save(state);

            City city = new City();
            city.setState(state);
            city.setName("Tehran");
            city.setLatitude("35.6891975");
            city.setLatitude("51.3889736");
            cityRepository.save(city);

            List<Location> locations = new ArrayList<Location>();

            LocationType locationType = new LocationType();
            locationType.setName("Store");
            locationType.setDescription("Local business locations");
            locationTypeRepository.save(locationType);

            Location location1 = new Location();
            location1.setName("Location 1");
            location1.setCity(city);
            location1.setLocationType(locationType);
            location1.setLatitude("35.7247777");
            location1.setLongitude("51.4124017");
            location1.setDescription("Location 1 description");
            location1.setAddress("Location 1 address");
            location1.setAdditionalData("{ \"level\" : 1 }");
            location1.setRating((short) 4);
            location1.setCover(true);
            location1.setImageSlide((short)0);
            locations.add(location1);

            Location location2 = new Location();
            location2.setName("Location 2");
            location2.setCity(city);
            location2.setLocationType(locationType);
            location2.setLatitude("35.7316409");
            location2.setLongitude("51.3995915");
            location2.setDescription("Location 2 description");
            location2.setAddress("Location 2 address");
            location2.setAdditionalData("{ \"level\" : 4 }");
            location2.setRating((short) 1);
            location2.setCover(false);
            location2.setImageSlide((short)0);
            locations.add(location2);

            Location location3 = new Location();
            location3.setName("Location 3");
            location3.setCity(city);
            location3.setLocationType(locationType);
            location3.setLatitude("35.7337137");
            location3.setLongitude("51.4329796");
            location3.setDescription("Location 3 description");
            location3.setAddress("Location 3 address");
            location3.setAdditionalData("{ \"level\" : 2 }");
            location3.setRating((short) 3);
            location3.setCover(false);
            location3.setImageSlide((short)0);
            locations.add(location3);

            locationRepository.saveAll(locations);

        }
    }

}
