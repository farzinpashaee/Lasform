package com.lasform.model.entity;

import lombok.Data;
import org.springframework.lang.Nullable;

import javax.persistence.*;

@Entity
@Data
public class Location {

    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private long id;
    @Column(length=15)
    private String latitude;
    @Column(length=15)
    private String longitude;
    @Column(length=80)
    private String name;
    @Column(length=200)
    private String description;
    @Column(length=150)
    private String address;
    @Column(length=200)
    private String additionalData;
    private boolean cover;
    private short imageSlide = 0;
    private short rating = 0;
    @OneToOne
    @JoinColumn(name = "CITY_ID")
    private City city;
    @OneToOne
    @JoinColumn(name = "LOCATION_TYPE_ID")
    private LocationType locationType;
    @OneToOne
    @JoinColumn(name = "LOCATION_GROUP_ID")
    @Nullable
    private LocationGroup locationGroup;


}
