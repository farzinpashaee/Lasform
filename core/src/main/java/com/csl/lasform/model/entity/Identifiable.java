package com.csl.lasform.model.entity;

/** Implemented by every persisted entity so generic web/service code can resolve an id without reflection. */
public interface Identifiable {

    String getId();
}
