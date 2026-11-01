package com.airquality.backend.service;

import com.airquality.backend.dto.FastApiPredictionResponseDTO;
import com.airquality.backend.dto.PredictionDTO;
import com.airquality.backend.dto.PredictionRequestDTO;
import com.airquality.backend.entity.HistoricalData;
import com.airquality.backend.entity.Location;
import com.airquality.backend.entity.PredictionRecord;
import com.airquality.backend.repository.HistoricalDataRepository;
import com.airquality.backend.repository.LocationRepository;
import com.airquality.backend.repository.PredictionRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PredictionService {

    private final HistoricalDataRepository historicalDataRepository;
    private final LocationRepository locationRepository;
    private final PredictionRecordRepository predictionRecordRepository;
    private final FastApiClientService fastApiClientService;

    public PredictionDTO predictAqi(Long locationId) {
        if (locationId == null) {
            throw new IllegalArgumentException("Location ID must be provided.");
        }

        Location location = locationRepository.findById(locationId)
                .orElseThrow(() -> new IllegalArgumentException("Location with ID " + locationId + " was not found in the database."));

        List<HistoricalData> historicalDataList = historicalDataRepository.findByLocationIdOrderByRecordDateDesc(locationId);

        if (historicalDataList == null || historicalDataList.size() < 7) {
            int count = (historicalDataList == null) ? 0 : historicalDataList.size();
            throw new IllegalStateException("LSTM prediction requires at least 7 chronological historical records for "
                    + location.getCityName() + " (with all 7 features: PM2.5, PM10, NO2, CO, SO2, O3, AQI). Currently available: " + count + " records.");
        }

        // Take the latest 7 records and order them sequentially for prediction
        List<HistoricalData> last7Days = historicalDataList.subList(0, 7);

        // Verify all 7 features exist
        for (HistoricalData d : last7Days) {
            if (d.getPm25() == null || d.getPm10() == null || d.getNo2() == null ||
                d.getCo() == null || d.getSo2() == null || d.getO3() == null || d.getAqi() == null) {
                throw new IllegalStateException("Incomplete historical features on date " + d.getRecordDate()
                        + " for " + location.getCityName() + ". All 7 pollutant and AQI features are required.");
            }
        }

        // Target date is explicitly 1 day after the most recent historical record
        LocalDate targetDate = last7Days.get(0).getRecordDate().plusDays(1);

        Optional<PredictionRecord> existingRecordOpt = predictionRecordRepository.findByLocationIdAndTargetDate(locationId, targetDate);

        // Explicit Duplicate Handling: If a prediction already exists for this target date, return it
        if (existingRecordOpt.isPresent()) {
            return mapToDTO(existingRecordOpt.get());
        }

        List<PredictionRequestDTO.DailyAirQualityDTO> dailyAirQualityList = new ArrayList<>();
        // historicalDataList is ordered by recordDate desc; iterate backwards to ensure strictly ascending chronological order
        for (int i = last7Days.size() - 1; i >= 0; i--) {
            HistoricalData data = last7Days.get(i);
            dailyAirQualityList.add(new PredictionRequestDTO.DailyAirQualityDTO(
                    data.getRecordDate().toString(),
                    data.getPm25(),
                    data.getPm10(),
                    data.getNo2(),
                    data.getCo(),
                    data.getSo2(),
                    data.getO3(),
                    data.getAqi()
            ));
        }

        PredictionRequestDTO requestDTO = new PredictionRequestDTO(location.getCityName(), dailyAirQualityList);
        FastApiPredictionResponseDTO responseDTO = fastApiClientService.getPrediction(requestDTO);

        PredictionRecord record = new PredictionRecord();
        record.setLocation(location);
        record.setTargetDate(targetDate);
        record.setPredictedAqi(responseDTO.getPredictedAqi());
        record.setAqiCategory(responseDTO.getAqiCategory());

        record = predictionRecordRepository.save(record);

        return mapToDTO(record);
    }

    public List<PredictionDTO> getPredictionHistory(Long locationId) {
        locationRepository.findById(locationId)
                .orElseThrow(() -> new RuntimeException("Location not found"));

        return predictionRecordRepository.findByLocationIdOrderByTargetDateDesc(locationId)
                .stream()
                .map(this::mapToDTO)
                .toList();
    }

    private PredictionDTO mapToDTO(PredictionRecord record) {
        return new PredictionDTO(
                record.getId(),
                record.getLocation().getId(),
                record.getTargetDate(),
                record.getPredictedAqi(),
                record.getAqiCategory(),
                record.getCreatedAt()
        );
    }
}
