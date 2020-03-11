package com.lasform.core.model.entity;

import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.lang.Nullable;

import javax.persistence.*;
import java.util.Date;

import static javax.persistence.TemporalType.TIMESTAMP;

@Data
@Entity
@EntityListeners(AuditingEntityListener.class)
public class Location extends Auditable<String> {

    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private long id;
    @Column(length=25)
    private String latitude;
    @Column(length=25)
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
//    @CreatedDate
//    Date createDate;
//    @LastModifiedDate
//    Date modifiedDate;


}
