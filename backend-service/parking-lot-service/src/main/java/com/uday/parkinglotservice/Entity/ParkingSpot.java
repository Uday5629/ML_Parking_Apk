package com.uday.parkinglotservice.Entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Entity
@ToString(exclude = "level")
@EqualsAndHashCode(exclude = "level")
@Table(name = "parking_spot", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"spot_code", "level_id"}, name = "uk_spot_code_level")
})
public class ParkingSpot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "spot_code", nullable = false)
    private String spotCode;  // e.g., "A1", "A2", "B1"

    @Column(nullable = false)
    private String spotType;  // CAR, BIKE, EV, HANDICAPPED

    // Spot status: AVAILABLE, OCCUPIED, DISABLED
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private SpotStatus status = SpotStatus.AVAILABLE;

    // Legacy fields kept for backward compatibility
    private boolean isDisabled;
    private boolean isOccupied;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "level_id", nullable = false)
    @JsonBackReference
    private ParkingLevel level;

    public enum SpotStatus {
        AVAILABLE,
        OCCUPIED,
        DISABLED
    }

    // Helper methods for status management
    public boolean isAvailable() {
        return status == SpotStatus.AVAILABLE;
    }

    public void occupy() {
        if (status == SpotStatus.DISABLED) {
            throw new IllegalStateException("Cannot occupy a disabled spot");
        }
        this.status = SpotStatus.OCCUPIED;
        this.isOccupied = true;
    }

    public void release() {
        if (status == SpotStatus.DISABLED) {
            return; // Don't change disabled spots
        }
        this.status = SpotStatus.AVAILABLE;
        this.isOccupied = false;
    }

    public void disable() {
        this.status = SpotStatus.DISABLED;
        this.isDisabled = true;
    }

    public void enable() {
        this.status = SpotStatus.AVAILABLE;
        this.isDisabled = false;
        this.isOccupied = false;
    }
}
