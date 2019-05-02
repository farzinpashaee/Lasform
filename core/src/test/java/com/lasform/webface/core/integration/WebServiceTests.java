package com.lasform.webface.core.integration;


import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@RunWith(SpringRunner.class)
@SpringBootTest
@AutoConfigureMockMvc
public class WebServiceTests {

    @Autowired
    private MockMvc mockMvc;

    @Value("${server.port}")
    String portNumber;

    @Test
    public void echoTest() throws Exception {
        mockMvc.perform(
                get("/api/location/echo?message=TestMessage")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("echo message"))
                .andDo(print())
                .andExpect(status().isOk());
    }


    @Test
    public void findLocationByIdTest() throws Exception {
        mockMvc.perform(
                post("/api/location/findLocationById")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":1}"))
                .andDo(print())
                .andExpect(status().isOk());
    }

    @Test
    public void findLocationByNameTest() throws Exception {
        mockMvc.perform(
                post("/api/location/findLocationByName")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test\"}"))
                .andDo(print())
                .andExpect(status().isOk());
    }


    @Test
    public void searchLocationsTest() throws Exception {
        mockMvc.perform(
                post("/api/location/searchLocations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test\"}"))
                .andDo(print())
                .andExpect(status().isOk());
    }

    @Test
    public void searchLocationsByNameTest() throws Exception {
        mockMvc.perform(
                post("/api/location/searchLocationsByName")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test\"}"))
                .andDo(print())
                .andExpect(status().isOk());
    }



}
