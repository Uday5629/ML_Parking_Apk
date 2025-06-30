package com.uday.parkinglotservice.Entity;

import jakarta.persistence.*;
import lombok.Data;


@Data
@Entity
public class ParkingSpot {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String spotType; // SMALL, MEDIUM, LARGE
    private boolean isDisabled;
    private boolean isOccupied;

    @ManyToOne
    @JoinColumn(name = "level_id")
    private ParkingLevel level;

    // Getters, Setters, Constructors
}
