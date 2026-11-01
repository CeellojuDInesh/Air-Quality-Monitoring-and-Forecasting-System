package com.airquality.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PredictionDTO {
    private Long id;
    private Long locationId;
    private LocalDate targetDate;
    private Double predictedAqi;
    private String aqiCategory;
    private LocalDateTime createdAt;

    public LocalDateTime getPredictionDate() {
        return createdAt;
    }
}
