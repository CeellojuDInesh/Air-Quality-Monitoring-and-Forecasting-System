package com.airquality.backend.controller;

import com.airquality.backend.dto.HistoricalDataDTO;
import com.airquality.backend.service.HistoricalDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/historical")
@RequiredArgsConstructor
public class HistoricalDataController {

    private final HistoricalDataService historicalDataService;

    @GetMapping("/{locationId}")
    public ResponseEntity<List<HistoricalDataDTO>> getHistoricalDataByLocation(
            @PathVariable Long locationId,
            @RequestParam(required = false, defaultValue = "30") Integer days) {
        return ResponseEntity.ok(historicalDataService.getHistoricalDataByLocation(locationId, days));
    }

    @PostMapping
    public ResponseEntity<HistoricalDataDTO> createHistoricalData(@RequestBody HistoricalDataDTO historicalDataDTO) {
        return ResponseEntity.ok(historicalDataService.createHistoricalData(historicalDataDTO));
    }
}
