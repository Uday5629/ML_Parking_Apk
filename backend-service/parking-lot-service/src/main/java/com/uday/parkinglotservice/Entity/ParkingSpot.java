package com.uday.parkinglotservice.Entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Entity
@ToString(exclude = "level")
@EqualsAndHashCode(exclude = "level")
public class ParkingSpot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String spotType;

    private boolean isDisabled;
    private boolean isOccupied;

    @ManyToOne
    @JoinColumn(name = "level_id")
    @JsonBackReference
    private ParkingLevel level;
}
