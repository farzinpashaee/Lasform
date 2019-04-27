package com.lasform.core.helper;

import com.lasform.core.model.dto.GeoAreaDto;
import com.lasform.core.model.dto.LatLng;
import com.lasform.core.model.dto.LocationBoundary;

import java.util.Arrays;
import java.util.Collections;

public class AreaHelper {

    public static LocationBoundary calculateAreaBoundaryFromList(GeoAreaDto geoAreaDto ){
        LocationBoundary result = new LocationBoundary();
        int nodeSize = geoAreaDto.getAreaList().size();
        Double[] lats = new Double[nodeSize];
        Double[] lngs = new Double[nodeSize];
        for(int i = 0 ; i < nodeSize ; i++ ){
            lats[i] = Double.parseDouble( geoAreaDto.getAreaList().get(i).getLatitude() );
            lngs[i] = Double.parseDouble( geoAreaDto.getAreaList().get(i).getLongitude() );
        }
        result.setNortheast(new LatLng(Collections.max(Arrays.asList(lats)).toString() , Collections.max(Arrays.asList(lngs)).toString() ));
        result.setSouthwest(new LatLng(Collections.min(Arrays.asList(lats)).toString() , Collections.min(Arrays.asList(lngs)).toString() ));
        return result;
    }

}
