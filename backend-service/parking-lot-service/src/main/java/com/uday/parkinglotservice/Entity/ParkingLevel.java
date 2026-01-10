package com.uday.parkinglotservice.Entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@ToString(exclude = "spots")
@EqualsAndHashCode(exclude = "spots")
@Table(name = "parking_level", uniqueConstraints = {
    @UniqueConstraint(columnNames = "levelNumber", name = "uk_level_number")
})
public class ParkingLevel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String levelNumber;

    @Column
    private String name;  // Display name

    @Column
    private int totalSpots;

    @OneToMany(mappedBy = "level", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<ParkingSpot> spots = new ArrayList<>();

    // Helper method to add spots
    public void addSpot(ParkingSpot spot) {
        spots.add(spot);
        spot.setLevel(this);
    }

    // Helper method to remove spots
    public void removeSpot(ParkingSpot spot) {
        spots.remove(spot);
        spot.setLevel(null);
    }
}
