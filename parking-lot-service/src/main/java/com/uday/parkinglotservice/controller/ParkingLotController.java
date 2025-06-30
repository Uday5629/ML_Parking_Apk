package com.uday.parkinglotservice.controller;

import com.uday.parkinglotservice.Entity.*;
import com.uday.parkinglotservice.Service.ParkingLotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/parking-lot")
public class ParkingLotController {

    @Autowired
    private ParkingLotService service;

    @GetMapping("/levels")
    public List<ParkingLevel> getLevels() {
        return service.getAllLevels();
    }

    @PostMapping("/levels")
    public ParkingLevel addLevel(@RequestBody ParkingLevel level) {
        return service.addLevel(level);
    }

    @GetMapping("/spots/{levelId}")
    public List<ParkingSpot> getSpots(@PathVariable Long levelId,
                                      @RequestParam boolean isDisabled) {
        return service.getAvailableSpots(levelId, isDisabled);
    }

    @PutMapping("/spot/{spotId}")
    public void updateSpot(@PathVariable Long spotId, @RequestParam boolean isOccupied) {
        service.updateSpotStatus(spotId, isOccupied);
    }
}
