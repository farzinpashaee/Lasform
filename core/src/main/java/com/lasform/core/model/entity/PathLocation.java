package com.lasform.core.model.entity;


import lombok.Data;
import org.springframework.data.annotation.CreatedDate;

import javax.persistence.*;
import java.util.Date;

@Data
@Entity
public class PathLocation {

    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private long id;
    @Column(length=25)
    private String latitude;
    @Column(length=25)
    private String longitude;
    @CreatedDate
    Date createDate;

}
