package com.uday.ticketingservice.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AvailableSlotsResponse {
    private Long spotId;
    private String spotCode;
    private LocalDate date;
    private List<TimeSlot> availableSlots;
    private int totalSlots;
    private int bookedSlots;
}
