package com.lasform.model.entity;

import javax.persistence.*;

@Entity
public class State {

    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private long id;
    private String name;
    @OneToOne
    private Country country;

}
