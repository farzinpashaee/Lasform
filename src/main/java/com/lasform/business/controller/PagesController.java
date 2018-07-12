package com.lasform.business.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.stereotype.Controller;

@Controller
public class PagesController {

    @RequestMapping("/manage")
    public String manage() {
        return "manage";
    }

}
