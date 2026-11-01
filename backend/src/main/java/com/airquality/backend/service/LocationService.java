package com.airquality.backend.service;

import com.airquality.backend.dto.LocationDTO;
import com.airquality.backend.entity.Location;
import com.airquality.backend.repository.LocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LocationService {

    private final LocationRepository locationRepository;

    public List<LocationDTO> getAllLocations() {
        return locationRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public LocationDTO getLocationById(Long id) {
        return locationRepository.findById(id)
                .map(this::mapToDTO)
                .orElseThrow(() -> new RuntimeException("Location not found"));
    }

    public LocationDTO createLocation(LocationDTO dto) {
        Location location = new Location();
        location.setCityName(dto.getCityName());
        location.setLatitude(dto.getLatitude());
        location.setLongitude(dto.getLongitude());
        location = locationRepository.save(location);
        return mapToDTO(location);
    }

    private LocationDTO mapToDTO(Location location) {
        return new LocationDTO(location.getId(), location.getCityName(), location.getLatitude(), location.getLongitude());
    }
}
