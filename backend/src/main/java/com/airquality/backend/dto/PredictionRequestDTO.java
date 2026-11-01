package com.airquality.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PredictionRequestDTO {
    private String location;
    private List<DailyAirQualityDTO> data;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyAirQualityDTO {
        private String timestamp;

        @JsonProperty("PM2.5")
        private Double pm25;

        @JsonProperty("PM10")
        private Double pm10;

        @JsonProperty("NO2")
        private Double no2;

        @JsonProperty("CO")
        private Double co;

        @JsonProperty("SO2")
        private Double so2;

        @JsonProperty("O3")
        private Double o3;

        @JsonProperty("AQI")
        private Double aqi;
    }
}
