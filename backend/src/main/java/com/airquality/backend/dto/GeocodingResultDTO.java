package com.airquality.backend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Represents a single city result returned by Open-Meteo Geocoding API.
 * Maps to the 'results' array in the geocoding response.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GeocodingResultDTO {
    private Long id;
    private String name;
    private Double latitude;
    private Double longitude;
    private String country;
    private String timezone;
    // admin1 = state/province level
    private String admin1;
}
