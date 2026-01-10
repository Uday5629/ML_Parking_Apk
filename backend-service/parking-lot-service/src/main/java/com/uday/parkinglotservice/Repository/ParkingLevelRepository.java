package com.uday.parkinglotservice.Repository;

import com.uday.parkinglotservice.Entity.ParkingLevel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ParkingLevelRepository extends JpaRepository<ParkingLevel, Long> {

    // Check if level number already exists
    boolean existsByLevelNumber(String levelNumber);

    // Find level by level number
    Optional<ParkingLevel> findByLevelNumber(String levelNumber);
}
