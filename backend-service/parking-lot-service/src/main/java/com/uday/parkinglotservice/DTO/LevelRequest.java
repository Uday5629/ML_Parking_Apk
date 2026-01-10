package com.uday.parkinglotservice.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class LevelRequest {
    private String levelNumber;       // e.g., "Level 1", "Ground Floor"
    private String name;              // Display name (optional, defaults to levelNumber)
    private int totalSpots;           // Total number of spots to create
    private List<SpotRequest> spots;  // Optional: Custom spot configurations

    // Spot distribution (used when spots list is null for auto-generation)
    private int carSpots;             // Number of CAR spots
    private int bikeSpots;            // Number of BIKE spots
    private int evSpots;              // Number of EV spots
    private int handicappedSpots;     // Number of HANDICAPPED spots
}
