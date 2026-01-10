package com.uday.ticketingservice.Repository;

import com.uday.ticketingservice.Entity.Reservation;
import com.uday.ticketingservice.Entity.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    List<Reservation> findByUserEmailOrderByStartTimeDesc(String userEmail);

    Optional<Reservation> findByIdAndUserEmail(Long id, String userEmail);

    @Query("SELECT r FROM Reservation r WHERE r.userEmail = :email " +
           "AND r.status IN ('CREATED', 'ACTIVE') " +
           "ORDER BY r.startTime ASC")
    List<Reservation> findActiveReservationsByEmail(@Param("email") String email);

    // conflict detection - checks if time ranges overlap
    @Query("SELECT COUNT(r) > 0 FROM Reservation r " +
           "WHERE r.spotId = :spotId " +
           "AND r.status IN ('CREATED', 'ACTIVE') " +
           "AND r.startTime < :endTime " +
           "AND r.endTime > :startTime")
    boolean existsSpotConflict(
        @Param("spotId") Long spotId,
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime
    );

    // used to block ticket creation when a reservation exists
    @Query("SELECT COUNT(r) > 0 FROM Reservation r " +
           "WHERE r.spotId = :spotId " +
           "AND r.status IN ('CREATED', 'ACTIVE') " +
           "AND r.startTime <= :ticketStartTime " +
           "AND r.endTime > :ticketStartTime")
    boolean existsBlockingReservationForSpot(
        @Param("spotId") Long spotId,
        @Param("ticketStartTime") LocalDateTime ticketStartTime
    );

    @Query("SELECT r FROM Reservation r " +
           "WHERE r.spotId = :spotId " +
           "AND r.status IN ('CREATED', 'ACTIVE') " +
           "AND r.startTime <= :ticketStartTime " +
           "AND r.endTime > :ticketStartTime")
    Optional<Reservation> findBlockingReservationForSpot(
        @Param("spotId") Long spotId,
        @Param("ticketStartTime") LocalDateTime ticketStartTime
    );

    @Query("SELECT COUNT(r) > 0 FROM Reservation r " +
           "WHERE r.vehicleNumber = :vehicleNumber " +
           "AND r.status IN ('CREATED', 'ACTIVE') " +
           "AND r.startTime < :endTime " +
           "AND r.endTime > :startTime")
    boolean existsVehicleConflict(
        @Param("vehicleNumber") String vehicleNumber,
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime
    );

    @Query("SELECT r FROM Reservation r " +
           "WHERE r.spotId = :spotId " +
           "AND r.status IN ('CREATED', 'ACTIVE') " +
           "AND DATE(r.startTime) = :date " +
           "ORDER BY r.startTime ASC")
    List<Reservation> findBySpotIdAndDate(
        @Param("spotId") Long spotId,
        @Param("date") LocalDate date
    );

    @Query("SELECT r FROM Reservation r " +
           "WHERE r.levelId = :levelId " +
           "AND r.status IN ('CREATED', 'ACTIVE') " +
           "AND DATE(r.startTime) = :date " +
           "ORDER BY r.startTime ASC")
    List<Reservation> findByLevelIdAndDate(
        @Param("levelId") Long levelId,
        @Param("date") LocalDate date
    );

    // for expiry scheduler
    @Query("SELECT r FROM Reservation r " +
           "WHERE r.status = 'CREATED' " +
           "AND r.startTime < :cutoff")
    List<Reservation> findExpiredReservations(@Param("cutoff") LocalDateTime cutoff);

    long countByStatus(ReservationStatus status);

    List<Reservation> findAllByOrderByStartTimeDesc();

    // get spot IDs currently blocked by reservations at the given time
    @Query("SELECT DISTINCT r.spotId FROM Reservation r " +
           "WHERE r.levelId = :levelId " +
           "AND r.status IN ('CREATED', 'ACTIVE') " +
           "AND r.startTime <= :now " +
           "AND r.endTime > :now")
    List<Long> findCurrentlyBlockedSpotIds(
        @Param("levelId") Long levelId,
        @Param("now") LocalDateTime now
    );
}
