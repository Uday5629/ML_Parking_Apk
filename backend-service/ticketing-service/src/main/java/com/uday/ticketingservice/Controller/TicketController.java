package com.uday.ticketingservice.Controller;

import com.uday.ticketingservice.DTO.CreateTicketRequest;
import com.uday.ticketingservice.DTO.SystemStatsResponse;
import com.uday.ticketingservice.DTO.TicketResponse;
import com.uday.ticketingservice.Entity.Ticket;
import com.uday.ticketingservice.ticketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

import java.util.List;

@RestController
@RequestMapping("/ticketing")
public class TicketController {

    @Autowired
    private ticketService ticketService;

    @GetMapping
    public ResponseEntity<String> ticketsHome() {
        return ResponseEntity.ok("Ticketing Service is up and running!");
    }

    // ========== USER ENDPOINTS ==========

    /**
     * Create a ticket for a user (vehicle entry)
     * POST /ticketing/user/create
     */
    @PostMapping("/user/create")
    public ResponseEntity<?> createUserTicket(@RequestBody CreateTicketRequest request) {
        try {
            Ticket ticket = ticketService.createTicket(request);
            return ResponseEntity.ok(TicketResponse.builder()
                    .id(ticket.getId())
                    .userId(ticket.getUserId())
                    .userEmail(ticket.getUserEmail())
                    .vehicleNumber(ticket.getVehicleNumber())
                    .spotId(ticket.getSpotId())
                    .levelId(ticket.getLevelId())
                    .entryTime(ticket.getEntryTime())
                    .status(ticket.getStatus())
                    .message("Ticket created successfully")
                    .build());
        } catch (IllegalStateException e) {
            // Spot is reserved or not available
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create ticket: " + e.getMessage()));
        }
    }

    /**
     * Get all tickets for a user
     * GET /ticketing/user/tickets?email=user@email.com
     */
    @GetMapping("/user/tickets")
    public ResponseEntity<List<TicketResponse>> getUserTickets(@RequestParam String email) {
        return ResponseEntity.ok(ticketService.getUserTickets(email));
    }

    /**
     * Get active tickets for a user
     * GET /ticketing/user/tickets/active?email=user@email.com
     */
    @GetMapping("/user/tickets/active")
    public ResponseEntity<List<TicketResponse>> getUserActiveTickets(@RequestParam String email) {
        return ResponseEntity.ok(ticketService.getUserActiveTickets(email));
    }

    /**
     * Get a specific ticket for a user (validates ownership)
     * GET /ticketing/user/tickets/{ticketId}?email=user@email.com
     */
    @GetMapping("/user/tickets/{ticketId}")
    public ResponseEntity<TicketResponse> getUserTicket(
            @PathVariable Long ticketId,
            @RequestParam String email) {
        return ResponseEntity.ok(ticketService.getUserTicket(ticketId, email));
    }

    /**
     * Exit a vehicle for a user (validates ownership)
     * PUT /ticketing/user/exit/{ticketId}?email=user@email.com
     */
    @PutMapping("/user/exit/{ticketId}")
    public ResponseEntity<?> exitUserVehicle(
            @PathVariable Long ticketId,
            @RequestParam String email) {
        try {
            return ResponseEntity.ok(ticketService.exitUserVehicle(ticketId, email));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    // ========== ADMIN ENDPOINTS ==========

    /**
     * Get all tickets (admin only)
     * GET /ticketing/admin/tickets
     */
    @GetMapping("/admin/tickets")
    public ResponseEntity<List<TicketResponse>> getAllTickets() {
        return ResponseEntity.ok(ticketService.getAllTickets());
    }

    /**
     * Get all active tickets (admin only)
     * GET /ticketing/admin/tickets/active
     */
    @GetMapping("/admin/tickets/active")
    public ResponseEntity<List<TicketResponse>> getAllActiveTickets() {
        return ResponseEntity.ok(ticketService.getAllActiveTickets());
    }

    /**
     * Get system statistics (admin only)
     * GET /ticketing/admin/stats
     */
    @GetMapping("/admin/stats")
    public ResponseEntity<SystemStatsResponse> getSystemStats() {
        return ResponseEntity.ok(ticketService.getSystemStats());
    }

    /**
     * Get any ticket by ID (admin only)
     * GET /ticketing/admin/tickets/{ticketId}
     */
    @GetMapping("/admin/tickets/{ticketId}")
    public ResponseEntity<Ticket> getTicketAdmin(@PathVariable Long ticketId) {
        return ResponseEntity.ok(ticketService.getTicket(ticketId));
    }

    /**
     * Exit any ticket (admin only)
     * PUT /ticketing/admin/exit/{ticketId}
     */
    @PutMapping("/admin/exit/{ticketId}")
    public ResponseEntity<Ticket> exitTicketAdmin(@PathVariable Long ticketId) {
        return ResponseEntity.ok(ticketService.exit(ticketId));
    }

    // ========== LEGACY ENDPOINTS (backward compatible) ==========

    @PostMapping("/create")
    public ResponseEntity<?> createTicket(
            @RequestParam Long spotId,
            @RequestParam String vehicleNumber) {
        System.out.println("ticket create called in controller");
        try {
            Ticket ticket = ticketService.createTicket(spotId, vehicleNumber);
            return ResponseEntity.ok(TicketResponse.builder()
                    .id(ticket.getId())
                    .spotId(ticket.getSpotId())
                    .vehicleNumber(ticket.getVehicleNumber())
                    .entryTime(ticket.getEntryTime())
                    .status(ticket.getStatus())
                    .build());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create ticket: " + e.getMessage()));
        }
    }

    @PutMapping("/exit/{ticketId}")
    public ResponseEntity<Ticket> exit(@PathVariable Long ticketId) {
        return ResponseEntity.ok(ticketService.exit(ticketId));
    }

    @GetMapping("/{ticketId}")
    public Ticket getTicket(@PathVariable Long ticketId) {
        return ticketService.getTicket(ticketId);
    }
}
