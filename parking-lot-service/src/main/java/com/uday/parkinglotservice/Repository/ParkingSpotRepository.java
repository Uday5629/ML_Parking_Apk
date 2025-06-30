package com.uday.parkinglotservice.Repository;

import com.uday.parkinglotservice.Entity.ParkingSpot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ParkingSpotRepository extends JpaRepository<ParkingSpot, Long> {
    List<ParkingSpot> findByLevelIdAndIsOccupiedFalseAndIsDisabled(Long levelId, boolean isDisabled);
}
