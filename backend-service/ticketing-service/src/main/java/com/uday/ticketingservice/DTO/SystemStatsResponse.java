package com.uday.ticketingservice.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SystemStatsResponse {
    private long totalTickets;
    private long activeTickets;
    private long closedTickets;
    private long activeVehicles;
}
