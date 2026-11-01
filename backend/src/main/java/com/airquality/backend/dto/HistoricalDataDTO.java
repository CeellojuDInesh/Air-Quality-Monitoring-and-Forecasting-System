package com.airquality.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HistoricalDataDTO {
    private Long id;
    private Long locationId;
    private LocalDate recordDate;
    private Double pm25;
    private Double pm10;
    private Double no2;
    private Double co;
    private Double so2;
    private Double o3;
    private Double aqi;
}
