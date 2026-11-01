package com.airquality.backend.repository;

import com.airquality.backend.entity.HistoricalData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HistoricalDataRepository extends JpaRepository<HistoricalData, Long> {
    List<HistoricalData> findByLocationIdOrderByRecordDateDesc(Long locationId);
}
