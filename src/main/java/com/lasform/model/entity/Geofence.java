package com.lasform.model.entity;

import com.lasform.C;
import lombok.Data;

import javax.persistence.*;

@Data
@Entity
public class Geofence {

    @Id
    @GeneratedValue(strategy= GenerationType.AUTO)
    private long id;
    @Column(length=80)
    private String name;
    @Column(length=200)
    private String description;
    @OneToOne
    @JoinColumn(name = "GEO_AREA_ID")
    private GeoArea geoArea;


}