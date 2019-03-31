package com.lasform.model.entity;

import org.springframework.lang.Nullable;

import javax.persistence.*;

@Entity
public class Location {

    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private long id;
    private String latitude;
    private String longitude;
    private String name;
    private String description;
    private String address;
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
    @Nullable
    @JoinColumn(name = "LOCATION_GROUP_ID")
    private LocationGroup locationGroup;


    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public String getLatitude() {
        return latitude;
    }

    public void setLatitude(String latitude) {
        this.latitude = latitude;
    }

    public String getLongitude() {
        return longitude;
    }

    public void setLongitude(String longitude) {
        this.longitude = longitude;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public City getCity() {
        return city;
    }

    public void setCity(City city) {
        this.city = city;
    }

    public LocationType getLocationType() {
        return locationType;
    }

    public void setLocationType(LocationType locationType) {
        this.locationType = locationType;
    }

    public String getAdditionalData() {
        return additionalData;
    }

    public void setAdditionalData(String additionalData) {
        this.additionalData = additionalData;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isCover() {
        return cover;
    }

    public void setCover(boolean cover) {
        this.cover = cover;
    }

    public short getImageSlide() {
        return imageSlide;
    }

    public void setImageSlide(short imageSlide) {
        this.imageSlide = imageSlide;
    }

    public short getRating() {
        return rating;
    }

    public void setRating(short rating) {
        this.rating = rating;
    }
}
