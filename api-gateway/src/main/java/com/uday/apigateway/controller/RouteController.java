package com.uday.apigateway.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api")
public class RouteController {

    @Autowired
    private RestTemplate restTemplate;

    private final String PARKING_SERVICE = "http://PARKING-LOT-SERVICE";
    private final String TICKETING_SERVICE = "http://TICKETING-SERVICE";

    @GetMapping("/parking/**")
    public ResponseEntity<?> forwardToParking(HttpServletRequest request) {
        String path = request.getRequestURI().replace("/api", "");
        String url = PARKING_SERVICE + path;
        return restTemplate.exchange(url, HttpMethod.GET, null, String.class);
    }

    @GetMapping("/tickets/**")
    public ResponseEntity<?> forwardToTickets(HttpServletRequest request) {
        String path = request.getRequestURI().replace("/api", "");
        String url = TICKETING_SERVICE + path;
        return restTemplate.exchange(url, HttpMethod.GET, null, String.class);
    }
}
