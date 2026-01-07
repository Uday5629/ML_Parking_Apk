package com.uday.parkinglotservice.Repository;

import com.uday.parkinglotservice.Entity.ParkingSpot;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ParkingSpotRepository extends JpaRepository<ParkingSpot, Long> {
    List<ParkingSpot> findByLevelIdAndIsOccupiedFalseAndIsDisabled(Long levelId, boolean isDisabled);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
   SELECT s FROM ParkingSpot s
   WHERE s.level.id = :levelId
     AND s.isOccupied = false
     AND s.isDisabled = :isDisabled""")
    List<ParkingSpot> findAvailableSpotsForUpdate(
            @Param("levelId") Long levelId,
            @Param("isDisabled") boolean isDisabled
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
   SELECT s FROM ParkingSpot s
   WHERE s.id = :spotId""")
    ParkingSpot findSpotForUpdate(@Param("spotId") Long spotId);



}
