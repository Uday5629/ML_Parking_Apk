package com.uday.parkinglotservice.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class SpotRequest {
    private String spotCode;      // e.g., "A1", "A2", "B1" - optional, auto-generated if null
    private String spotType;      // CAR, BIKE, EV, HANDICAPPED
    private boolean isDisabled;   // true for handicapped spots
}
