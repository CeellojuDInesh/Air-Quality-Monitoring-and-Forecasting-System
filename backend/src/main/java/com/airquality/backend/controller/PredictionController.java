package com.airquality.backend.controller;

import com.airquality.backend.dto.PredictionDTO;
import com.airquality.backend.service.PredictionService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/predictions")
@RequiredArgsConstructor
public class PredictionController {

    private final PredictionService predictionService;

    @PostMapping("/predict")
    public ResponseEntity<?> predictAqi(@RequestParam(required = false) Long locationId) {
        if (locationId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "No monitored location ID provided."));
        }
        try {
            PredictionDTO predictionDTO = predictionService.predictAqi(locationId);
            return ResponseEntity.ok(predictionDTO);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage() != null ? e.getMessage() : "Internal server error during prediction."));
        }
    }

    @GetMapping("/{locationId}")
    public ResponseEntity<?> getPredictionHistory(@PathVariable Long locationId) {
        try {
            return ResponseEntity.ok(predictionService.getPredictionHistory(locationId));
        } catch (Exception e) {
            return ResponseEntity.ok(List.of());
        }
    }
}
