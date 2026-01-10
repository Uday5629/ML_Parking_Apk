package com.uday.parkinglotservice.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class VehicleRequest {
    private String licensePlate;
    private String type;
    private boolean isDisabled;
}
