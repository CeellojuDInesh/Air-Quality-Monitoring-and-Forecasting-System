package com.airquality.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Current air quality readings from Open-Meteo Air Quality API.
 * All concentrations are in µg/m³ except us_aqi which is unitless.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LiveAirQualityDTO {

    private Double latitude;
    private Double longitude;
    private String timezone;

    @JsonProperty("pm25")
    private Double pm25;

    @JsonProperty("pm10")
    private Double pm10;

    @JsonProperty("no2")
    private Double no2;

    @JsonProperty("co")
    private Double co;

    @JsonProperty("so2")
    private Double so2;

    @JsonProperty("o3")
    private Double o3;

    @JsonProperty("usAqi")
    private Integer usAqi;

    /** ISO-8601 timestamp of the reading (e.g. "2026-11-01T12:00") */
    private String timestamp;
}
