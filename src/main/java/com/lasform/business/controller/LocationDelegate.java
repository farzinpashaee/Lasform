package com.lasform.business.controller;


import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/location")
public class LocationDelegate {

    @RequestMapping(value="/test", method = RequestMethod.POST)
    private String getResponse(){
        return "";
    }

}
