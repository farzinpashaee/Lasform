package com.lasform.core.model.entity;

import com.lasform.core.model.dto.LatLng;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;

import javax.persistence.*;
import java.util.Date;
import java.util.List;

@Data
@Entity
public class Path {

    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private long id;
    private String name;
    private String description;
    private String departureLocation;
    private String destinationLocation;
    @OneToMany
    @JoinColumn(name = "PATH_LOCATIONS")
    private List<PathLocation> pathLocations;
    @CreatedDate
    Date createDate;
    @LastModifiedDate
    Date modifiedDate;

}
