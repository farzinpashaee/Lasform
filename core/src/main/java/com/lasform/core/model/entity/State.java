package com.lasform.core.model.entity;

import lombok.Data;

import javax.persistence.*;

@Data
@Entity
public class State {

    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private long id;
    private String name;
    @OneToOne
    @JoinColumn(name = "COUNTRY_ID")
    private Country country;
    private String code;

}
