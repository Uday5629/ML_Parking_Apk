package com.uday.ticketingservice.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "ticket")
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // User who created the ticket (for user-specific queries)
    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private String userEmail;

    private String vehicleNumber;

    private Long spotId;

    private Long levelId;

    private LocalDateTime entryTime;

    private LocalDateTime exitTime;

    // Ticket status: ACTIVE, CLOSED
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private TicketStatus status = TicketStatus.ACTIVE;

    // Fee calculated on exit
    private Double fee;

    public enum TicketStatus {
        ACTIVE,
        CLOSED
    }

    // Helper method to check if ticket is active
    public boolean isActive() {
        return status == TicketStatus.ACTIVE && exitTime == null;
    }
}
