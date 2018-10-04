package com.lasform.business.repository;

import com.lasform.model.entity.Location;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface LocationRepository extends JpaRepository<Location,Long> {


    @Query("SELECT l FROM Location l WHERE l.name like %:nameQuery% ")
    public List<Location> searchByName( String nameQuery );

    @Query("SELECT l FROM Location l WHERE l.latitude < ?1 AND l.latitude < ?2 and l.latitude > ?3 and l.longitude > ?4 ")
    public List<Location> getLocationsInBoundary( String northEastLat ,
                                                  String northEastLng ,
                                                  String southWestLat ,
                                                  String southWestLng );

    @Query("SELECT count(l) FROM Location l WHERE l.latitude < ?1 AND l.latitude < ?2 and l.latitude > ?3 and l.longitude > ?4 ")
    public Long getLocationsCountInBoundary( String northEastLat ,
                                                  String northEastLng ,
                                                  String southWestLat ,
                                                  String southWestLng );
}
