package com.uday.parkinglotservice.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class LevelResponse {
    private Long id;
    private String levelNumber;
    private String name;
    private int totalSpots;
    private int availableSpots;
    private int occupiedSpots;
    private Map<String, Integer> spotsByType;  // e.g., {"CAR": 10, "BIKE": 5}
    private List<SpotResponse> spots;
    private String message;
}
