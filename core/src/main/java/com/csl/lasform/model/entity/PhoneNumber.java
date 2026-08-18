package com.csl.lasform.model.entity;

import com.csl.lasform.model.entity.enums.PhoneNumberType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * A single contact number, embedded in {@link Location} — a location may list several
 * (main line, fax, WhatsApp, ...).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode
@ToString
public class PhoneNumber {

    private PhoneNumberType type;

    /** E.164 calling code, e.g. {@code "+1"}. */
    private String countryCode;

    private String number;

    private String extension;
}
