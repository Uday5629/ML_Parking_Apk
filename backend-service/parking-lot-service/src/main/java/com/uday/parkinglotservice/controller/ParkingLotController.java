package com.uday.parkinglotservice.controller;

import com.uday.parkinglotservice.DTO.*;
import com.uday.parkinglotservice.Entity.*;
import com.uday.parkinglotservice.ParkingLotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/parking")
public class ParkingLotController {

    private final ParkingLotService service;

    @Autowired
    public ParkingLotController(ParkingLotService service) {
        this.service = service;
    }

    // ========== PUBLIC/USER ENDPOINTS ==========

    /**
     * Get all parking levels (basic) - Available to all users
     * GET /parking/levels
     */
    @GetMapping("/levels")
    public ResponseEntity<List<LevelResponse>> getLevels() {
        return ResponseEntity.ok(service.getAllLevels());
    }

    /**
     * Get all parking levels with detailed spot information - Available to all users
     * GET /parking/levels/details
     */
    @GetMapping("/levels/details")
    public ResponseEntity<List<LevelResponse>> getLevelsWithDetails() {
        return ResponseEntity.ok(service.getAllLevelsWithDetails());
    }

    /**
     * Get all spots for a level (available and occupied) - Available to all users
     * GET /parking/levels/{levelId}/spots/all
     */
    @GetMapping("/levels/{levelId}/spots/all")
    public ResponseEntity<List<SpotResponse>> getAllSpotsForLevel(@PathVariable Long levelId) {
        return ResponseEntity.ok(service.getAllSpotsByLevel(levelId));
    }

    /**
     * Get available spots by level (filtered by disability status) - Available to all users
     * GET /parking/spots/{levelId}?isDisabled=false
     */
    @GetMapping("/spots/{levelId}")
    public List<ParkingSpot> getSpots(@PathVariable Long levelId,
                                      @RequestParam boolean isDisabled) {
        return service.getAvailableSpots(levelId, isDisabled);
    }

    /**
     * Get parking system stats - Available to all users for status display
     * GET /parking/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<ParkingStatsResponse> getParkingStats() {
        return ResponseEntity.ok(service.getParkingStats());
    }

    // ========== ADMIN ENDPOINTS ==========

    /**
     * Legacy: Add a parking level (without spots) - Admin only
     * POST /parking/levels
     * @deprecated Use POST /parking/admin/levels/create for creating levels with spots
     */
    @PostMapping("/levels")
    public ParkingLevel addLevel(@RequestBody ParkingLevel level) {
        return service.addLevel(level);
    }

    /**
     * Create a new parking level WITH spots (atomic operation) - Admin only
     * POST /parking/admin/levels/create
     */
    @PostMapping("/admin/levels/create")
    public ResponseEntity<LevelResponse> createLevelWithSpots(@RequestBody LevelRequest request) {
        LevelResponse response = service.createLevelWithSpots(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Also keep original endpoint for backward compatibility
     */
    @PostMapping("/levels/create")
    public ResponseEntity<LevelResponse> createLevelWithSpotsLegacy(@RequestBody LevelRequest request) {
        LevelResponse response = service.createLevelWithSpots(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Add a single spot to an existing level - Admin only
     * POST /parking/admin/levels/{levelId}/spots
     */
    @PostMapping("/admin/levels/{levelId}/spots")
    public ResponseEntity<SpotResponse> addSpotToLevel(
            @PathVariable Long levelId,
            @RequestBody SpotRequest spotRequest) {
        SpotResponse response = service.addSpotToLevel(levelId, spotRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Keep original endpoint for backward compatibility
     */
    @PostMapping("/levels/{levelId}/spots")
    public ResponseEntity<SpotResponse> addSpotToLevelLegacy(
            @PathVariable Long levelId,
            @RequestBody SpotRequest spotRequest) {
        SpotResponse response = service.addSpotToLevel(levelId, spotRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Occupy a specific spot (used by ticketing-service) - Internal API
     * PUT /parking/spots/{spotId}/occupy
     * Uses pessimistic locking to prevent race conditions
     */
    @PutMapping("/spots/{spotId}/occupy")
    public ResponseEntity<SpotResponse> occupySpot(@PathVariable Long spotId) {
        return ResponseEntity.ok(service.occupySpot(spotId));
    }

    /**
     * Release a specific spot (used by ticketing-service) - Internal API
     * PUT /parking/spots/{spotId}/release
     * Uses pessimistic locking
     */
    @PutMapping("/spots/{spotId}/release")
    public ResponseEntity<Void> releaseSpot(@PathVariable Long spotId) {
        service.releaseSpot(spotId);
        return ResponseEntity.ok().build();
    }

    /**
     * Enable a disabled spot - Admin only
     * PUT /parking/admin/spots/{spotId}/enable
     */
    @PutMapping("/admin/spots/{spotId}/enable")
    public ResponseEntity<SpotResponse> enableSpot(@PathVariable Long spotId) {
        return ResponseEntity.ok(service.enableSpot(spotId));
    }

    /**
     * Disable a spot - Admin only
     * PUT /parking/admin/spots/{spotId}/disable
     */
    @PutMapping("/admin/spots/{spotId}/disable")
    public ResponseEntity<SpotResponse> disableSpot(@PathVariable Long spotId) {
        return ResponseEntity.ok(service.disableSpot(spotId));
    }

    /**
     * Get detailed admin stats - Admin only
     * GET /parking/admin/stats
     */
    @GetMapping("/admin/stats")
    public ResponseEntity<ParkingStatsResponse> getAdminParkingStats() {
        return ResponseEntity.ok(service.getParkingStats());
    }

    // ========== VEHICLE ENTRY/EXIT ENDPOINTS ==========

    /**
     * Vehicle Entry - allocate spot and create ticket - Admin only
     * POST /parking/entry
     */
    @PostMapping("/entry")
    public TicketDetails vehicleEntry(
            @RequestParam Long levelId,
            @RequestParam boolean isDisabled,
            @RequestParam String vehicleNumber
    ) {
        System.out.println("Entry-endpoint was hit");
        return service.allocateSpotAndCreateTicket(levelId, isDisabled, vehicleNumber);
    }

    /**
     * Vehicle Exit - process payment and release spot - Admin only
     * PUT /parking/exit
     */
    @PutMapping("/exit")
    public void vehicleExit(@RequestParam Long ticketId) {
        service.exitVehicle(ticketId);
    }
}
