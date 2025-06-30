package com.uday.vehicleservice.controller;

import com.uday.vehicleservice.entity.Vehicle;
import com.uday.vehicleservice.service.VehicleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/vehicle")
public class VehicleController {

    @Autowired
    private VehicleService service;

    @PostMapping
    public Vehicle addVehicle(@RequestBody Vehicle vehicle) {
        return service.saveVehicle(vehicle);
    }

    @GetMapping
    public List<Vehicle> getAllVehicles() {
        return service.getAllVehicles();
    }

    @GetMapping("/{license}")
    public Vehicle getVehicle(@PathVariable String license) {
        return service.getVehicleByLicense(license);
    }

    @DeleteMapping("/{id}")
    public void deleteVehicle(@PathVariable Long id) {
        service.deleteVehicle(id);
    }
}
