package com.airquality.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Air quality forecast for a single calendar day.
 * Aggregated from Open-Meteo hourly data (daily peak us_aqi, noon-hour pollutants).
 * All concentrations are in µg/m³ except usAqi which is unitless.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ForecastDayDTO {

    /** Calendar date in YYYY-MM-DD format */
    private String date;

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

    /** Peak US AQI for the day (null if all hourly values are null) */
    @JsonProperty("usAqi")
    private Integer usAqi;
}
