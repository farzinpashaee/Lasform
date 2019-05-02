package com.lasform.core.integration;


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

    @Test
    public void getLocationsInCityTest() throws Exception {
        mockMvc.perform(
                post("/api/location/getLocationsInCity")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":0}"))
                .andDo(print())
                .andExpect(status().isOk());
    }

    @Test
    public void getLocationsInStateTest() throws Exception {
        mockMvc.perform(
                post("/api/location/getLocationsInState")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":0}"))
                .andDo(print())
                .andExpect(status().isOk());
    }

    @Test
    public void getLocationsInCountryTest() throws Exception {
        mockMvc.perform(
                post("/api/location/getLocationsInCountry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":0}"))
                .andDo(print())
                .andExpect(status().isOk());
    }

    @Test
    public void getLocationsInBoundaryTest() throws Exception {
        mockMvc.perform(
                post("/api/location/getLocationsInBoundary")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"northeast\":{\"latitude\":\"0\",\"longitude\":\"0\"},\"southwest\":{\"latitude\":\"0\",\"longitude\":\"0\"}}"))
                .andDo(print())
                .andExpect(status().isOk());
    }

    @Test
    public void getLocationsCountInBoundaryTest() throws Exception {
        mockMvc.perform(
                post("/api/location/getLocationsCountInBoundary")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"northeast\":{\"latitude\":\"0\",\"longitude\":\"0\"},\"southwest\":{\"latitude\":\"0\",\"longitude\":\"0\"}}"))
                .andDo(print())
                .andExpect(status().isOk());
    }

    @Test
    public void getLocationsInRadiusTest() throws Exception {
        mockMvc.perform(
                post("/api/location/getLocationsInRadius")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"center\":{\"latitude\":\"0\",\"longitude\":\"0\"},\"radius\":1}"))
                .andDo(print())
                .andExpect(status().isOk());
    }
}
