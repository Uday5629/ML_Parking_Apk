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
public class ParkingLevel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String levelNumber;

//    @OneToMany(mappedBy = "level", )
//    private List<ParkingSpot> spots;

    @OneToMany(mappedBy = "level",fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<ParkingSpot> spots = new ArrayList<>();
}