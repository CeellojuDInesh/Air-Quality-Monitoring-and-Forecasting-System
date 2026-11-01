package com.airquality.backend.integration;

import com.airquality.backend.dto.FastApiPredictionResponseDTO;
import com.airquality.backend.entity.HistoricalData;
import com.airquality.backend.entity.Location;
import com.airquality.backend.entity.PredictionRecord;
import com.airquality.backend.repository.HistoricalDataRepository;
import com.airquality.backend.repository.LocationRepository;
import com.airquality.backend.repository.PredictionRecordRepository;
import com.airquality.backend.service.FastApiClientService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class PredictionIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private LocationRepository locationRepository;

    @Autowired
    private HistoricalDataRepository historicalDataRepository;

    @Autowired
    private PredictionRecordRepository predictionRecordRepository;

    @MockitoBean
    private FastApiClientService fastApiClientService;

    private Location testLocation;

    @BeforeEach
    public void setup() {
        predictionRecordRepository.deleteAll();
        historicalDataRepository.deleteAll();
        locationRepository.deleteAll();

        testLocation = new Location(null, "TestCity", 12.0, 13.0);
        testLocation = locationRepository.save(testLocation);

        // Insert 7 days of dummy historical data
        LocalDate startDate = LocalDate.of(2023, 1, 1);
        for (int i = 0; i < 7; i++) {
            HistoricalData data = new HistoricalData(null, testLocation, startDate.plusDays(i),
                    10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0);
            historicalDataRepository.save(data);
        }
    }

    @Test
    public void testGeneratePredictionE2E() throws Exception {
        FastApiPredictionResponseDTO mockResponse = new FastApiPredictionResponseDTO();
        mockResponse.setPredictedAqi(85.0);
        mockResponse.setTargetDate("2023-01-08");
        mockResponse.setAqiCategory("Satisfactory");
        mockResponse.setModel("LSTM");
        mockResponse.setLocation("TestCity");

        Mockito.when(fastApiClientService.getPrediction(any())).thenReturn(mockResponse);

        mockMvc.perform(post("/api/predictions/predict")
                .param("locationId", testLocation.getId().toString())
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.predictedAqi").value(85.0))
                .andExpect(jsonPath("$.aqiCategory").value("Satisfactory"));

        // Verify it was saved in the database
        Optional<PredictionRecord> saved = predictionRecordRepository.findByLocationIdAndTargetDate(testLocation.getId(), LocalDate.of(2023, 1, 8));
        assertThat(saved).isPresent();
        assertThat(saved.get().getPredictedAqi()).isEqualTo(85.0);
    }

    @Test
    public void testGetPredictionHistory() throws Exception {
        PredictionRecord record = new PredictionRecord();
        record.setLocation(testLocation);
        record.setTargetDate(LocalDate.of(2023, 1, 8));
        record.setPredictedAqi(85.0);
        record.setAqiCategory("Satisfactory");
        predictionRecordRepository.save(record);

        mockMvc.perform(get("/api/predictions/" + testLocation.getId())
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].predictedAqi").value(85.0))
                .andExpect(jsonPath("$[0].aqiCategory").value("Satisfactory"));
    }

    @Test
    public void testCorsHeadersAllowedForFrontend() throws Exception {
        mockMvc.perform(get("/api/locations")
                .header("Origin", "http://localhost:5173"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }
}
