package com.airquality.backend.service;

import com.airquality.backend.dto.FastApiPredictionResponseDTO;
import com.airquality.backend.dto.PredictionRequestDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class FastApiClientService {

    private final RestTemplate restTemplate;
    private final String fastApiUrl;

    public FastApiClientService(RestTemplate restTemplate, @Value("${fastapi.url:${fastapi.base-url:http://localhost:8000}}") String fastApiUrl) {
        this.restTemplate = restTemplate;
        this.fastApiUrl = fastApiUrl;
    }

    public FastApiPredictionResponseDTO getPrediction(PredictionRequestDTO requestDTO) {
        String url = fastApiUrl + "/predict";
        return restTemplate.postForObject(url, requestDTO, FastApiPredictionResponseDTO.class);
    }
}
