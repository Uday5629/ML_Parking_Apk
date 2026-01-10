package com.uday.ticketingservice.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CheckInResponse {
    private Long reservationId;
    private Long ticketId;
    private String status;
    private String spotCode;
    private String message;
}
