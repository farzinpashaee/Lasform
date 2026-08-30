package com.csl.lasform.model.entity;

import java.util.List;

/** Implemented by entities that can have {@link Image}s attached (Location, Device). */
public interface Imageable {

    List<Image> getImages();

    void setImages(List<Image> images);
}
