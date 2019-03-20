package com.lasform.business.controller;


import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mobileDelegate")
@EnableWebSecurity
public class MobileDelegateController {
}
