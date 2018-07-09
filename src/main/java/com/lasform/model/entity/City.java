package com.lasform.model.entity;

import javax.persistence.*;

@Entity
public class City {

    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private long id;
    private String name;
    @OneToOne
    private State state;

}
