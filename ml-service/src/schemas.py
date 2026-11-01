from pydantic import BaseModel, Field, validator
from typing import List
from datetime import date

class DailyAirQuality(BaseModel):
    timestamp: date
    pm25: float = Field(alias='PM2.5')
    pm10: float = Field(alias='PM10')
    no2: float = Field(alias='NO2')
    co: float = Field(alias='CO')
    so2: float = Field(alias='SO2')
    o3: float = Field(alias='O3')
    aqi: float = Field(alias='AQI')

    class Config:
        populate_by_name = True

class PredictionRequest(BaseModel):
    location: str
    data: List[DailyAirQuality]

    @validator('data')
    def validate_sequence_length(cls, v):
        if len(v) != 7:
            raise ValueError('Exactly 7 days of historical data are required.')

        # Also validate that the dates are strictly chronological
        for i in range(1, len(v)):
            if v[i].timestamp <= v[i-1].timestamp:
                raise ValueError('Timestamps must be in strictly ascending chronological order.')
        return v

class PredictionResponse(BaseModel):
    location: str
    target_date: str
    predicted_aqi: float
    aqi_category: str
    model: str = "LSTM"

class ModelInfo(BaseModel):
    model_type: str
    input_window_days: int
    features: List[str]
    target: str
    version: str
