package com.uday.ticketingservice.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TimeSlot {
    private LocalDateTime start;
    private LocalDateTime end;

    /**
     * Check if this slot overlaps with another time range
     */
    public boolean overlaps(LocalDateTime otherStart, LocalDateTime otherEnd) {
        return start.isBefore(otherEnd) && end.isAfter(otherStart);
    }

    /**
     * Get start time only (for display)
     */
    public LocalTime getStartTimeOnly() {
        return start.toLocalTime();
    }

    /**
     * Get end time only (for display)
     */
    public LocalTime getEndTimeOnly() {
        return end.toLocalTime();
    }
}
