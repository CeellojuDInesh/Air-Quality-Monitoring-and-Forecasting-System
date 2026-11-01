package com.airquality.backend.service;

import com.airquality.backend.dto.ForecastDayDTO;
import com.airquality.backend.dto.GeocodingResultDTO;
import com.airquality.backend.dto.LiveAirQualityDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Service that proxies Open-Meteo public APIs (no API key required).
 *
 * Geocoding:   https://geocoding-api.open-meteo.com/v1/search
 * Air Quality: https://air-quality-api.open-meteo.com/v1/air-quality
 *
 * All external HTTP calls stay in Spring Boot — React never contacts Open-Meteo directly.
 */
@Service
public class OpenMeteoService {

    private static final Logger log = LoggerFactory.getLogger(OpenMeteoService.class);

    private final RestTemplate restTemplate;

    @Value("${open-meteo.geocoding-url}")
    private String geocodingUrl;

    @Value("${open-meteo.air-quality-url}")
    private String airQualityUrl;

    public OpenMeteoService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    // -------------------------------------------------------------------------
    // 1. Geocoding — search locations by name
    // -------------------------------------------------------------------------

    /**
     * Searches for locations matching the given query string.
     * Returns up to 10 results from Open-Meteo Geocoding API.
     *
     * @param query City / place name entered by the user.
     * @return List of matching locations (empty list if none found).
     */
    @SuppressWarnings("unchecked")
    public List<GeocodingResultDTO> searchLocations(String query) {
        String url = UriComponentsBuilder.fromUriString(geocodingUrl)
                .queryParam("name", query)
                .queryParam("count", 10)
                .queryParam("language", "en")
                .queryParam("format", "json")
                .toUriString();

        log.debug("Geocoding request: {}", url);

        Map<String, Object> response = restTemplate.getForObject(url, Map.class);
        List<GeocodingResultDTO> results = new ArrayList<>();

        if (response == null || !response.containsKey("results")) {
            return results; // no matches
        }

        List<Map<String, Object>> rawResults = (List<Map<String, Object>>) response.get("results");
        if (rawResults == null) {
            return results;
        }

        for (Map<String, Object> r : rawResults) {
            GeocodingResultDTO dto = new GeocodingResultDTO();
            dto.setId(toLong(r.get("id")));
            dto.setName(toString(r.get("name")));
            dto.setLatitude(toDouble(r.get("latitude")));
            dto.setLongitude(toDouble(r.get("longitude")));
            dto.setCountry(toString(r.get("country")));
            dto.setTimezone(toString(r.get("timezone")));
            dto.setAdmin1(toString(r.get("admin1")));
            results.add(dto);
        }

        return results;
    }

    // -------------------------------------------------------------------------
    // 2. Live air quality — current hour reading
    // -------------------------------------------------------------------------

    /**
     * Returns the most recent hourly air quality reading for the given coordinates.
     *
     * @param lat Latitude
     * @param lon Longitude
     * @return LiveAirQualityDTO with the reading closest to the current UTC time.
     */
    @SuppressWarnings("unchecked")
    public LiveAirQualityDTO getLiveAirQuality(double lat, double lon) {
        String url = buildAirQualityUrl(lat, lon, 1);
        log.debug("Live AQ request: {}", url);

        Map<String, Object> response = restTemplate.getForObject(url, Map.class);
        if (response == null) {
            throw new RuntimeException("Empty response from Open-Meteo Air Quality API");
        }

        Map<String, Object> hourly = (Map<String, Object>) response.get("hourly");
        List<String> times    = (List<String>) hourly.get("time");
        List<Double> pm25List = toDoubleList(hourly.get("pm2_5"));
        List<Double> pm10List = toDoubleList(hourly.get("pm10"));
        List<Double> no2List  = toDoubleList(hourly.get("nitrogen_dioxide"));
        List<Double> coList   = toDoubleList(hourly.get("carbon_monoxide"));
        List<Double> so2List  = toDoubleList(hourly.get("sulphur_dioxide"));
        List<Double> o3List   = toDoubleList(hourly.get("ozone"));
        List<Integer> aqiList = toIntList(hourly.get("us_aqi"));

        // Find index of the hour closest to "now"
        int idx = findCurrentHourIndex(times);

        LiveAirQualityDTO dto = new LiveAirQualityDTO();
        dto.setLatitude(toDouble(response.get("latitude")));
        dto.setLongitude(toDouble(response.get("longitude")));
        dto.setTimezone(toString(response.get("timezone")));
        dto.setTimestamp(idx >= 0 && idx < times.size() ? times.get(idx) : null);
        dto.setPm25(getOrNull(pm25List, idx));
        dto.setPm10(getOrNull(pm10List, idx));
        dto.setNo2(getOrNull(no2List, idx));
        dto.setCo(getOrNull(coList, idx));
        dto.setSo2(getOrNull(so2List, idx));
        dto.setO3(getOrNull(o3List, idx));
        dto.setUsAqi(getOrNull(aqiList, idx));

        return dto;
    }

    // -------------------------------------------------------------------------
    // 3. 3-day forecast — next 3 calendar days
    // -------------------------------------------------------------------------

    /**
     * Returns air quality forecasts for the next 3 calendar days.
     * Uses daily-peak us_aqi and noon-hour pollutant values.
     *
     * @param lat Latitude
     * @param lon Longitude
     * @return List of 3 ForecastDayDTO objects (today+1, today+2, today+3).
     */
    @SuppressWarnings("unchecked")
    public List<ForecastDayDTO> get3DayForecast(double lat, double lon) {
        String url = buildAirQualityUrl(lat, lon, 4); // 4 days covers today + 3
        log.debug("3-day forecast request: {}", url);

        Map<String, Object> response = restTemplate.getForObject(url, Map.class);
        if (response == null) {
            throw new RuntimeException("Empty response from Open-Meteo Air Quality API");
        }

        Map<String, Object> hourly = (Map<String, Object>) response.get("hourly");
        List<String> times    = (List<String>) hourly.get("time");
        List<Double> pm25List = toDoubleList(hourly.get("pm2_5"));
        List<Double> pm10List = toDoubleList(hourly.get("pm10"));
        List<Double> no2List  = toDoubleList(hourly.get("nitrogen_dioxide"));
        List<Double> coList   = toDoubleList(hourly.get("carbon_monoxide"));
        List<Double> so2List  = toDoubleList(hourly.get("sulphur_dioxide"));
        List<Double> o3List   = toDoubleList(hourly.get("ozone"));
        List<Integer> aqiList = toIntList(hourly.get("us_aqi"));

        // Group hourly entries by calendar date
        // Map: date-string → list of row indices
        Map<String, List<Integer>> byDate = new LinkedHashMap<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");
        for (int i = 0; i < times.size(); i++) {
            String dateKey = times.get(i).substring(0, 10); // "YYYY-MM-DD"
            byDate.computeIfAbsent(dateKey, k -> new ArrayList<>()).add(i);
        }

        // Skip today — return the next 3 days
        LocalDate today = LocalDate.now();
        List<ForecastDayDTO> forecast = new ArrayList<>();

        for (Map.Entry<String, List<Integer>> entry : byDate.entrySet()) {
            LocalDate entryDate = LocalDate.parse(entry.getKey());
            if (!entryDate.isAfter(today)) {
                continue; // skip today and any past dates
            }

            List<Integer> indices = entry.getValue();

            // Peak AQI for the day
            Integer peakAqi = null;
            for (int idx : indices) {
                Integer v = getOrNull(aqiList, idx);
                if (v != null && (peakAqi == null || v > peakAqi)) {
                    peakAqi = v;
                }
            }

            // Use noon-hour (12:00) index if available, else midpoint of the day's data
            int repIdx = findNoonIndex(times, indices);

            ForecastDayDTO day = new ForecastDayDTO();
            day.setDate(entry.getKey());
            day.setPm25(getOrNull(pm25List, repIdx));
            day.setPm10(getOrNull(pm10List, repIdx));
            day.setNo2(getOrNull(no2List, repIdx));
            day.setCo(getOrNull(coList, repIdx));
            day.setSo2(getOrNull(so2List, repIdx));
            day.setO3(getOrNull(o3List, repIdx));
            day.setUsAqi(peakAqi);

            forecast.add(day);

            if (forecast.size() == 3) {
                break; // we have the 3 forecast days we need
            }
        }

        return forecast;
    }

    // -------------------------------------------------------------------------
    // 4. Reverse Geocoding — get area name from coordinates (e.g. Balanagar, Hyderabad)
    // -------------------------------------------------------------------------

    /**
     * Reverse geocodes coordinates to a human-readable area name.
     * Calls BigDataCloud client API (free, fast, no API key).
     */
    @SuppressWarnings("unchecked")
    public Map<String, String> reverseGeocode(double lat, double lon) {
        String displayName = null;
        try {
            String url = UriComponentsBuilder.fromUriString("https://api.bigdatacloud.net/data/reverse-geocode-client")
                    .queryParam("latitude", lat)
                    .queryParam("longitude", lon)
                    .queryParam("localityLanguage", "en")
                    .toUriString();

            Map<String, Object> resp = restTemplate.getForObject(url, Map.class);
            if (resp != null) {
                String locality = resp.get("locality") != null ? resp.get("locality").toString().trim() : "";
                String city = resp.get("city") != null ? resp.get("city").toString().trim() : "";
                String state = resp.get("principalSubdivision") != null ? resp.get("principalSubdivision").toString().trim() : "";

                if (!locality.isEmpty() && !city.isEmpty()) {
                    if (locality.equalsIgnoreCase(city)) {
                        displayName = city + (state.isEmpty() ? "" : ", " + state);
                    } else {
                        displayName = locality + ", " + city;
                    }
                } else if (!locality.isEmpty()) {
                    displayName = locality + (state.isEmpty() ? "" : ", " + state);
                } else if (!city.isEmpty()) {
                    displayName = city + (state.isEmpty() ? "" : ", " + state);
                }
            }
        } catch (Exception e) {
            log.warn("Reverse geocode failed: {}", e.getMessage());
        }

        if (displayName == null || displayName.isBlank()) {
            displayName = String.format("Location (%.3f, %.3f)", lat, lon);
        }

        return Map.of(
            "name", displayName,
            "latitude", String.valueOf(lat),
            "longitude", String.valueOf(lon)
        );
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private String buildAirQualityUrl(double lat, double lon, int forecastDays) {
        return UriComponentsBuilder.fromUriString(airQualityUrl)
                .queryParam("latitude", lat)
                .queryParam("longitude", lon)
                .queryParam("hourly", "pm2_5,pm10,nitrogen_dioxide,carbon_monoxide,sulphur_dioxide,ozone,us_aqi")
                .queryParam("timezone", "auto")
                .queryParam("forecast_days", forecastDays)
                .toUriString();
    }

    /**
     * Finds the hourly array index whose timestamp is closest to the current wall-clock time.
     * Open-Meteo timestamps are in "YYYY-MM-DDTHH:mm" local format (timezone=auto applied).
     */
    private int findCurrentHourIndex(List<String> times) {
        if (times == null || times.isEmpty()) return 0;
        LocalDateTime now = LocalDateTime.now();
        int best = 0;
        long bestDiff = Long.MAX_VALUE;
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");
        for (int i = 0; i < times.size(); i++) {
            try {
                LocalDateTime t = LocalDateTime.parse(times.get(i), fmt);
                long diff = Math.abs(java.time.Duration.between(t, now).toMinutes());
                if (diff < bestDiff) {
                    bestDiff = diff;
                    best = i;
                }
            } catch (Exception ignored) {
                // skip malformed timestamps
            }
        }
        return best;
    }

    /**
     * Finds the index of the noon-hour (12:00) reading for a given day's indices.
     * Falls back to the midpoint of the day's indices if no noon entry exists.
     */
    private int findNoonIndex(List<String> times, List<Integer> indices) {
        for (int idx : indices) {
            if (idx < times.size() && times.get(idx).endsWith("T12:00")) {
                return idx;
            }
        }
        // Fallback: midpoint
        return indices.get(indices.size() / 2);
    }

    // ---- Type-safe conversion helpers for Map<String,Object> parsing --------

    @SuppressWarnings("unchecked")
    private List<Double> toDoubleList(Object raw) {
        if (raw == null) return new ArrayList<>();
        List<?> list = (List<?>) raw;
        List<Double> result = new ArrayList<>(list.size());
        for (Object v : list) {
            result.add(v == null ? null : ((Number) v).doubleValue());
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private List<Integer> toIntList(Object raw) {
        if (raw == null) return new ArrayList<>();
        List<?> list = (List<?>) raw;
        List<Integer> result = new ArrayList<>(list.size());
        for (Object v : list) {
            result.add(v == null ? null : ((Number) v).intValue());
        }
        return result;
    }

    private <T> T getOrNull(List<T> list, int index) {
        if (list == null || index < 0 || index >= list.size()) return null;
        return list.get(index);
    }

    private Double toDouble(Object v) {
        return v == null ? null : ((Number) v).doubleValue();
    }

    private Long toLong(Object v) {
        return v == null ? null : ((Number) v).longValue();
    }

    private String toString(Object v) {
        return v == null ? null : v.toString();
    }
}
