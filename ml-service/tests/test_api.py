import pytest
from fastapi.testclient import TestClient
from src.main import app
import datetime

def test_health_check():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["model_loaded"] == True

def test_model_info():
    with TestClient(app) as client:
        response = client.get("/model/info")
        assert response.status_code == 200
        data = response.json()
        assert data["model_type"] == "LSTM"
        assert data["input_window_days"] == 7
        assert len(data["features"]) == 7

def test_predict_valid_request():
    with TestClient(app) as client:
        base_date = datetime.date(2023, 1, 1)
        test_data = []
        for i in range(7):
            test_data.append({
                "timestamp": (base_date + datetime.timedelta(days=i)).isoformat(),
                "PM2.5": 50.0 + i,
                "PM10": 100.0 + i,
                "NO2": 20.0,
                "CO": 1.0,
                "SO2": 10.0,
                "O3": 30.0,
                "AQI": 150.0 + i
            })

        request_payload = {
            "location": "Hyderabad",
            "data": test_data
        }

        response = client.post("/predict", json=request_payload)
        assert response.status_code == 200
        data = response.json()
        assert data["location"] == "Hyderabad"
        assert data["target_date"] == "2023-01-08"
        assert "predicted_aqi" in data
        assert "aqi_category" in data
        assert data["model"] == "LSTM"

def test_predict_insufficient_length():
    with TestClient(app) as client:
        test_data = [
            {
                "timestamp": "2023-01-01",
                "PM2.5": 50.0,
                "PM10": 100.0,
                "NO2": 20.0,
                "CO": 1.0,
                "SO2": 10.0,
                "O3": 30.0,
                "AQI": 150.0
            }
        ] # Only 1 day

        response = client.post("/predict", json={"location": "Hyderabad", "data": test_data})
        assert response.status_code == 422

def test_predict_missing_feature():
    with TestClient(app) as client:
        test_data = []
        for i in range(7):
            test_data.append({
                "timestamp": f"2023-01-0{i+1}",
                "PM2.5": 50.0,
                "NO2": 20.0,
                "CO": 1.0,
                "SO2": 10.0,
                "O3": 30.0,
                "AQI": 150.0
            })

        response = client.post("/predict", json={"location": "Hyderabad", "data": test_data})
        assert response.status_code == 422

def test_predict_invalid_numeric():
    with TestClient(app) as client:
        test_data = []
        for i in range(7):
            test_data.append({
                "timestamp": f"2023-01-0{i+1}",
                "PM2.5": "invalid_string",
                "PM10": 100.0,
                "NO2": 20.0,
                "CO": 1.0,
                "SO2": 10.0,
                "O3": 30.0,
                "AQI": 150.0
            })

        response = client.post("/predict", json={"location": "Hyderabad", "data": test_data})
        assert response.status_code == 422
