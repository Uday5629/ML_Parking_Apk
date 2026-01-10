package com.uday.parkinglotservice.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SpotResponse {
    private Long id;
    private String spotCode;
    private String spotType;
    private boolean isDisabled;
    private boolean isOccupied;
    private Long levelId;
}
