package com.lasform.model.dto;

public class LocationBoundary {

    private LatLng northeast;
    private LatLng southwest;

    public LatLng getNortheast() {
        return northeast;
    }

    public void setNortheast(LatLng northeast) {
        this.northeast = northeast;
    }

    public LatLng getSouthwest() {
        return southwest;
    }

    public void setSouthwest(LatLng southwest) {
        this.southwest = southwest;
    }
}
