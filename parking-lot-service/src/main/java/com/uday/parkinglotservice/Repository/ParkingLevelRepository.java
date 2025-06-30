package com.uday.parkinglotservice.Repository;

import com.uday.parkinglotservice.Entity.ParkingLevel;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ParkingLevelRepository extends JpaRepository<ParkingLevel, Long> {}
