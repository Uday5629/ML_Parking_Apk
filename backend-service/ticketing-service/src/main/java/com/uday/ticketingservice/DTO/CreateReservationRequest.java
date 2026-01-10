package com.uday.ticketingservice.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CreateReservationRequest {
    private String userId;
    private String userEmail;
    private String vehicleNumber;
    private Long spotId;
    private Long levelId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
}
