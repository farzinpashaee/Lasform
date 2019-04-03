package com.lasform.model.entity;

import lombok.Data;

import javax.persistence.*;

@Data
@Entity
public class City {

    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private long id;
    private String name;
    @OneToOne
    @JoinColumn(name = "STATE_ID")
    private State state;
    private String latitude;
    private String longitude;

}
