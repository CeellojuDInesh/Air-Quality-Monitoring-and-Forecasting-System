package com.airquality.backend.controller;

import com.airquality.backend.dto.ForecastDayDTO;
import com.airquality.backend.dto.GeocodingResultDTO;
import com.airquality.backend.dto.LiveAirQualityDTO;
import com.airquality.backend.service.OpenMeteoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Exposes Open-Meteo air quality data to the React frontend.
 *
 * All external calls stay inside Spring Boot — React never contacts Open-Meteo directly.
 *
 * Endpoints:
 *   GET /api/air-quality/search?query=Hyderabad
 *   GET /api/air-quality/live?lat=17.385&lon=78.4867
 *   GET /api/air-quality/forecast-3day?lat=17.385&lon=78.4867
 */
@RestController
@RequestMapping("/api/air-quality")
public class LiveAirQualityController {

    private static final Logger log = LoggerFactory.getLogger(LiveAirQualityController.class);

    private final OpenMeteoService openMeteoService;

    public LiveAirQualityController(OpenMeteoService openMeteoService) {
        this.openMeteoService = openMeteoService;
    }

    /**
     * Geocoding search — find locations matching the query string.
     *
     * Example: GET /api/air-quality/search?query=Hyderabad
     */
    @GetMapping("/search")
    public ResponseEntity<?> searchLocations(@RequestParam String query) {
        if (query == null || query.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Query parameter must not be blank"));
        }
        try {
            List<GeocodingResultDTO> results = openMeteoService.searchLocations(query.trim());
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            log.error("Geocoding search failed for query '{}': {}", query, e.getMessage());
            return ResponseEntity.status(503)
                    .body(Map.of("error", "Geocoding API unavailable: " + e.getMessage()));
        }
    }

    /**
     * Current (live) air quality reading for the given coordinates.
     *
     * Example: GET /api/air-quality/live?lat=17.385&lon=78.4867
     */
    @GetMapping("/live")
    public ResponseEntity<?> getLiveAirQuality(
            @RequestParam double lat,
            @RequestParam double lon) {
        try {
            LiveAirQualityDTO result = openMeteoService.getLiveAirQuality(lat, lon);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Live AQ fetch failed for lat={}, lon={}: {}", lat, lon, e.getMessage());
            return ResponseEntity.status(503)
                    .body(Map.of("error", "Open-Meteo API unavailable: " + e.getMessage()));
        }
    }

    /**
     * 3-day air quality forecast for the given coordinates.
     * Returns today+1, today+2, today+3 with daily peak AQI and noon-hour pollutant values.
     *
     * Example: GET /api/air-quality/forecast-3day?lat=17.385&lon=78.4867
     */
    @GetMapping("/forecast-3day")
    public ResponseEntity<?> get3DayForecast(
            @RequestParam double lat,
            @RequestParam double lon) {
        try {
            List<ForecastDayDTO> forecast = openMeteoService.get3DayForecast(lat, lon);
            return ResponseEntity.ok(forecast);
        } catch (Exception e) {
            log.error("3-day forecast failed for lat={}, lon={}: {}", lat, lon, e.getMessage());
            return ResponseEntity.status(503)
                    .body(Map.of("error", "Open-Meteo API unavailable: " + e.getMessage()));
        }
    }

    /**
     * Reverse geocode coordinates to an area name (e.g. Balanagar, Hyderabad).
     *
     * Example: GET /api/air-quality/reverse-geocode?lat=17.470&lon=78.458
     */
    @GetMapping("/reverse-geocode")
    public ResponseEntity<?> reverseGeocode(
            @RequestParam double lat,
            @RequestParam double lon) {
        Map<String, String> result = openMeteoService.reverseGeocode(lat, lon);
        return ResponseEntity.ok(result);
    }
}
