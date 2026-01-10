package com.uday.parkinglotservice.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ParkingStatsResponse {
    private long totalLevels;
    private long totalSpots;
    private long availableSpots;
    private long occupiedSpots;
    private long disabledSpots;
    private double occupancyPercentage;
    private List<LevelStats> levelStats;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class LevelStats {
        private Long levelId;
        private String levelNumber;
        private String levelName;
        private long totalSpots;
        private long availableSpots;
        private long occupiedSpots;
        private long disabledSpots;
        private double occupancyPercentage;
    }
}
