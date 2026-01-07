package com.uday.ticketingservice.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class TicketResponse {
    private Long id;
    private Long spotId;
    private String vehicleNumber;
    private LocalDateTime entryTime;
}

