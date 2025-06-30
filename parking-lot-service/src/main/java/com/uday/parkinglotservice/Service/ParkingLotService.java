package com.uday.parkinglotservice.Service;

import com.uday.parkinglotservice.Entity.*;
import com.uday.parkinglotservice.Repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ParkingLotService {

    @Autowired
    private ParkingLevelRepository levelRepo;

    @Autowired
    private ParkingSpotRepository spotRepo;

    public List<ParkingLevel> getAllLevels() {
        return levelRepo.findAll();
    }

    public ParkingLevel addLevel(ParkingLevel level) {
        return levelRepo.save(level);
    }

    public List<ParkingSpot> getAvailableSpots(Long levelId, boolean isDisabled) {
        return spotRepo.findByLevelIdAndIsOccupiedFalseAndIsDisabled(levelId, isDisabled);
    }

    public void updateSpotStatus(Long spotId, boolean isOccupied) {
        ParkingSpot spot = spotRepo.findById(spotId).orElseThrow();
        spot.setOccupied(isOccupied);
        spotRepo.save(spot);
    }
}
