package com.csl.lasform.model.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Reverse-geocoded address, embedded in {@link Location} to avoid repeated lookups.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode
@ToString
public class Address {

    private String address;

    private String city;

    private String country;

    private String zipcode;
}
