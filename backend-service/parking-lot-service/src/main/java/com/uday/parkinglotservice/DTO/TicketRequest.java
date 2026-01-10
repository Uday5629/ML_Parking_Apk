package com.uday.parkinglotservice.DTO;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class TicketRequest {

    // Getters and Setters
    private Long spotId;
    private String vehicleNumber;

    // Constructors
    public TicketRequest() {
    }

    public TicketRequest(Long spotId, String vehicleNumber) {
        this.spotId = spotId;
        this.vehicleNumber = vehicleNumber;
    }

}

