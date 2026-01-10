package com.uday.ticketingservice.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CreateTicketRequest {
    private String userId;
    private String userEmail;
    private String vehicleNumber;
    private Long spotId;
    private Long levelId;
}
