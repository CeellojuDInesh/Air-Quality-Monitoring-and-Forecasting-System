package com.airquality.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FastApiPredictionResponseDTO {
    private String location;

    @JsonProperty("target_date")
    private String targetDate;

    @JsonProperty("predicted_aqi")
    private Double predictedAqi;

    @JsonProperty("aqi_category")
    private String aqiCategory;

    private String model;
}
