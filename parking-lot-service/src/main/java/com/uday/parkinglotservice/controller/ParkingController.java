package com.uday.parkinglotservice.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("parking")
public class ParkingController {

    @GetMapping
    public ResponseEntity<String> getAllParkingSlots() {
        return ResponseEntity.ok("Parking slots working");
    }
}
