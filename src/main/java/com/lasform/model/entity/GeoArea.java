package com.lasform.model.entity;


import com.lasform.C;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;

import javax.persistence.*;
import java.util.Date;

@Data
@Entity
public class GeoArea {

    @Id
    @GeneratedValue(strategy= GenerationType.AUTO)
    private long id;
    @Column(length=80)
    private String name;
    @Column(length=200)
    private String description;
    private C.GEOFENCE_TYPE type;
    @Column(length=250)
    private String area; // [{lat1,lng1},{lat2,lng2},...]
    @Column(length=15)
    private String areaNortheastLatitude;
    @Column(length=15)
    private String areaNortheastLongitude;
    @Column(length=15)
    private String areaSouthwestLatitude;
    @Column(length=15)
    private String areaSouthwestLongitude;
    @CreatedDate
    Date createDate;
    @LastModifiedDate
    Date modifiedDate;
}
