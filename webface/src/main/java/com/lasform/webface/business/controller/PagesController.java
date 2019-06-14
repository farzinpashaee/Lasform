package com.lasform.webface.business.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.stereotype.Controller;

@Controller
public class PagesController {

    @Value("${lasform.application.mode}")
    String applicationMode;

    @GetMapping("/")
    public String index(@RequestParam(name="name", required=false, defaultValue="World") String name, Model model) {
        model.addAttribute("name", name);
        if( applicationMode.equals("MANAGEMENT")){
            return "management";
        } else {
            return "index";
        }
    }

    @RequestMapping("/manage")
    public String manage() {
        return "manage";
    }

}
