package com.airquality.backend.repository;

import com.airquality.backend.entity.PredictionRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PredictionRecordRepository extends JpaRepository<PredictionRecord, Long> {
    Optional<PredictionRecord> findByLocationIdAndTargetDate(Long locationId, LocalDate targetDate);
    List<PredictionRecord> findByLocationIdOrderByTargetDateDesc(Long locationId);
}
