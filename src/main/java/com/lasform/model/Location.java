package com.lasform.model;

import javax.persistence.*;

@Entity
public class Location {

    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private long id;
    private long latitude;
    private long longitude;
    private String name;
    private String address;
    @OneToOne
    private City city;
    @OneToOne
    private LocationType locationType;

}
