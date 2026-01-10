package com.uday.ticketingservice.DTO;

import com.uday.ticketingservice.Entity.Ticket.TicketStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TicketResponse {
    private Long id;
    private String userId;
    private String userEmail;
    private String vehicleNumber;
    private Long spotId;
    private Long levelId;
    private LocalDateTime entryTime;
    private LocalDateTime exitTime;
    private TicketStatus status;
    private Double fee;
    private String message;
}
