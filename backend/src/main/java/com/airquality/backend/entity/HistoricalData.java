package com.airquality.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;

@Entity
@Table(name = "historical_data", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"location_id", "record_date"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HistoricalData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id", nullable = false)
    private Location location;

    @Column(name = "record_date", nullable = false)
    private LocalDate recordDate;

    // Original AQI dataset units
    private Double pm25;
    private Double pm10;
    private Double no2;
    private Double co;
    private Double so2;
    private Double o3;
    private Double aqi;
}
