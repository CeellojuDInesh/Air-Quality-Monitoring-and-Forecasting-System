package com.airquality.backend.service;

import com.airquality.backend.dto.HistoricalDataDTO;
import com.airquality.backend.entity.HistoricalData;
import com.airquality.backend.entity.Location;
import com.airquality.backend.repository.HistoricalDataRepository;
import com.airquality.backend.repository.LocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HistoricalDataService {

    private final HistoricalDataRepository historicalDataRepository;
    private final LocationRepository locationRepository;

    public List<HistoricalDataDTO> getHistoricalDataByLocation(Long locationId, Integer days) {
        List<HistoricalDataDTO> allData = historicalDataRepository.findByLocationIdOrderByRecordDateDesc(locationId)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());

        if (days != null && days > 0 && allData.size() > days) {
            return allData.subList(0, days);
        }
        return allData;
    }

    public HistoricalDataDTO createHistoricalData(HistoricalDataDTO dto) {
        Location location = locationRepository.findById(dto.getLocationId())
                .orElseThrow(() -> new RuntimeException("Location not found"));

        HistoricalData data = new HistoricalData();
        data.setLocation(location);
        data.setRecordDate(dto.getRecordDate());
        data.setPm25(dto.getPm25());
        data.setPm10(dto.getPm10());
        data.setNo2(dto.getNo2());
        data.setCo(dto.getCo());
        data.setSo2(dto.getSo2());
        data.setO3(dto.getO3());
        data.setAqi(dto.getAqi());

        data = historicalDataRepository.save(data);
        return mapToDTO(data);
    }

    private HistoricalDataDTO mapToDTO(HistoricalData data) {
        return new HistoricalDataDTO(
                data.getId(),
                data.getLocation().getId(),
                data.getRecordDate(),
                data.getPm25(),
                data.getPm10(),
                data.getNo2(),
                data.getCo(),
                data.getSo2(),
                data.getO3(),
                data.getAqi()
        );
    }
}
