package com.uday.ticketingservice.Controller;

import com.uday.ticketingservice.DTO.*;
import com.uday.ticketingservice.Service.ReservationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/reservations")
@CrossOrigin(origins = "*")
public class ReservationController {

    @Autowired
    private ReservationService reservationService;

    @GetMapping("/health")
    public String health() {
        return "Reservation service running";
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateReservationRequest request) {
        try {
            ReservationResponse res = reservationService.createReservation(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(res);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(error(e));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(error(e));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Failed to create reservation: " + e.getMessage()));
        }
    }

    @GetMapping
    public List<ReservationResponse> getUserReservations(@RequestParam String email) {
        return reservationService.getUserReservations(email);
    }

    @GetMapping("/active")
    public List<ReservationResponse> getActiveReservations(@RequestParam String email) {
        return reservationService.getUserActiveReservations(email);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id, @RequestParam String email) {
        try {
            return ResponseEntity.ok(reservationService.getReservation(id, email));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(e));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancel(@PathVariable Long id, @RequestParam String email) {
        try {
            return ResponseEntity.ok(reservationService.cancelReservation(id, email));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(error(e));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(e));
        }
    }

    @PostMapping("/{id}/check-in")
    public ResponseEntity<?> checkIn(@PathVariable Long id, @RequestParam String email) {
        try {
            return ResponseEntity.ok(reservationService.checkIn(id, email));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(error(e));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(e));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Check-in failed: " + e.getMessage()));
        }
    }

    @GetMapping("/slots")
    public AvailableSlotsResponse getSlots(
            @RequestParam Long spotId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return reservationService.getAvailableSlots(spotId, date);
    }

    @GetMapping("/check-availability")
    public Map<String, Boolean> checkAvailability(
            @RequestParam Long spotId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        return Map.of("available", reservationService.isSlotAvailable(spotId, startTime, endTime));
    }

    @GetMapping("/blocked-spots")
    public Map<String, Object> getBlockedSpots(@RequestParam Long levelId) {
        List<Long> blockedSpotIds = reservationService.getBlockedSpotIds(levelId);
        return Map.of("levelId", levelId, "blockedSpotIds", blockedSpotIds);
    }

    @GetMapping("/admin/all")
    public List<ReservationResponse> getAllReservations() {
        return reservationService.getAllReservations();
    }

    private Map<String, String> error(Exception e) {
        return Map.of("error", e.getMessage());
    }
}
