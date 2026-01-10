package com.uday.ticketingservice.DTO;

import com.uday.ticketingservice.Entity.ReservationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReservationResponse {
    private Long id;
    private String userId;
    private String userEmail;
    private String vehicleNumber;
    private Long spotId;
    private String spotCode;
    private Long levelId;
    private String levelName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private ReservationStatus status;
    private Long ticketId;
    private LocalDateTime createdAt;

    // Computed fields
    private Boolean canCheckIn;
    private Boolean canCancel;
    private Long minutesUntilStart;

    private String message;
}
