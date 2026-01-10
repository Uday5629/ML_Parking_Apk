package com.uday.parkinglotservice.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class TicketDetails {

    private Long id;
    private String vehicleNumber;
    private Long spotId;
    private LocalDateTime entryTime;
    private LocalDateTime exitTime;

    // getters and setters
}

