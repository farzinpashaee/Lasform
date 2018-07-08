package com.lasform.model;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;

@Entity
public class LocationType {

    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private long id;
    private String name;

}
