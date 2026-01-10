package com.uday.parkinglotservice.Repository;

import com.uday.parkinglotservice.Entity.ParkingSpot;
import com.uday.parkinglotservice.Entity.ParkingSpot.SpotStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ParkingSpotRepository extends JpaRepository<ParkingSpot, Long> {

    List<ParkingSpot> findByLevelIdAndIsOccupiedFalseAndIsDisabled(Long levelId, boolean isDisabled);

    // Find all spots by level
    List<ParkingSpot> findByLevelId(Long levelId);

    // Check if spot code exists in a level
    boolean existsBySpotCodeAndLevelId(String spotCode, Long levelId);

    // Count spots by level
    long countByLevelId(Long levelId);

    // Count available spots by level
    long countByLevelIdAndIsOccupiedFalse(Long levelId);

    // Count occupied spots by level
    long countByLevelIdAndIsOccupiedTrue(Long levelId);

    // ========== STATUS-BASED QUERIES ==========

    // Count by status
    long countByStatus(SpotStatus status);

    // Count by status and level
    long countByLevelIdAndStatus(Long levelId, SpotStatus status);

    // Find by status
    List<ParkingSpot> findByStatus(SpotStatus status);

    // Find by level and status
    List<ParkingSpot> findByLevelIdAndStatus(Long levelId, SpotStatus status);

    // ========== SYSTEM STATS QUERIES ==========

    @Query("SELECT COUNT(s) FROM ParkingSpot s")
    long countTotalSpots();

    @Query("SELECT COUNT(s) FROM ParkingSpot s WHERE s.status = 'AVAILABLE'")
    long countAvailableSpots();

    @Query("SELECT COUNT(s) FROM ParkingSpot s WHERE s.status = 'OCCUPIED'")
    long countOccupiedSpots();

    @Query("SELECT COUNT(s) FROM ParkingSpot s WHERE s.status = 'DISABLED'")
    long countDisabledSpots();

    // ========== LOCKING QUERIES ==========

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
   WHERE s.level.id = :levelId
     AND s.status = 'AVAILABLE'""")
    List<ParkingSpot> findAvailableSpotsByStatusForUpdate(@Param("levelId") Long levelId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
   SELECT s FROM ParkingSpot s
   WHERE s.id = :spotId""")
    ParkingSpot findSpotForUpdate(@Param("spotId") Long spotId);
}
