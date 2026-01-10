package com.uday.ticketingservice.Repository;

import com.uday.ticketingservice.Entity.Ticket;
import com.uday.ticketingservice.Entity.Ticket.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface TicketRepository extends JpaRepository<Ticket, Long> {

    // Find by vehicle number
    Optional<Ticket> findByVehicleNumber(String vehicleNumber);

    // Find active ticket for vehicle
    Optional<Ticket> findByVehicleNumberAndExitTimeIsNull(String vehicleNumber);

    // ========== USER-SPECIFIC QUERIES ==========

    // Find all tickets for a user
    List<Ticket> findByUserIdOrderByEntryTimeDesc(String userId);

    // Find all tickets for a user by email
    List<Ticket> findByUserEmailOrderByEntryTimeDesc(String userEmail);

    // Find active tickets for a user
    List<Ticket> findByUserIdAndStatus(String userId, TicketStatus status);

    // Find active tickets for a user by email
    List<Ticket> findByUserEmailAndStatus(String userEmail, TicketStatus status);

    // Find ticket by ID and user (for ownership validation)
    Optional<Ticket> findByIdAndUserId(Long id, String userId);

    Optional<Ticket> findByIdAndUserEmail(Long id, String userEmail);

    // ========== ADMIN QUERIES ==========

    // Count active tickets
    long countByStatus(TicketStatus status);

    // Find all active tickets (system-wide)
    List<Ticket> findByStatusOrderByEntryTimeDesc(TicketStatus status);

    // Find all tickets (system-wide) ordered by entry time
    List<Ticket> findAllByOrderByEntryTimeDesc();

    // Count tickets by spot
    long countBySpotIdAndStatus(Long spotId, TicketStatus status);

    // Count tickets by level
    long countByLevelIdAndStatus(Long levelId, TicketStatus status);

    // ========== STATISTICS QUERIES ==========

    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.status = 'ACTIVE'")
    long countActiveTickets();

    @Query("SELECT COUNT(DISTINCT t.vehicleNumber) FROM Ticket t WHERE t.status = 'ACTIVE'")
    long countActiveVehicles();
}
