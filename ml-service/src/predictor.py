import os
import numpy as np
import joblib
import tensorflow as tf
from datetime import timedelta

class AQIPredictor:
    def __init__(self, model_path: str, scaler_features_path: str, scaler_target_path: str):
        self.model = None
        self.scaler_features = None
        self.scaler_target = None
        self.model_path = model_path
        self.scaler_features_path = scaler_features_path
        self.scaler_target_path = scaler_target_path

        # Load resources at initialization
        self.load_resources()

    def load_resources(self):
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model file not found at {self.model_path}")
        if not os.path.exists(self.scaler_features_path) or not os.path.exists(self.scaler_target_path):
            raise FileNotFoundError("Scaler files not found.")

        self.model = tf.keras.models.load_model(self.model_path)
        self.scaler_features = joblib.load(self.scaler_features_path)
        self.scaler_target = joblib.load(self.scaler_target_path)
        print("Model and scalers loaded successfully.")

    def get_aqi_category(self, aqi_value: float) -> str:
        """
        Indian National Air Quality Index (NAQI) categories
        """
        if aqi_value <= 50:
            return "Good"
        elif aqi_value <= 100:
            return "Satisfactory"
        elif aqi_value <= 200:
            return "Moderately Polluted"
        elif aqi_value <= 300:
            return "Poor"
        elif aqi_value <= 400:
            return "Very Poor"
        else:
            return "Severe"

    def predict(self, request_data):
        # Extract features in exact order: PM2.5, PM10, NO2, CO, SO2, O3, AQI
        features_list = []
        for day in request_data.data:
            features_list.append([
                day.pm25,
                day.pm10,
                day.no2,
                day.co,
                day.so2,
                day.o3,
                day.aqi
            ])

        # Convert to numpy array (7, 7)
        raw_sequence = np.array(features_list)

        # Scale features
        scaled_sequence = self.scaler_features.transform(raw_sequence)

        # Reshape for LSTM input: (batch_size, timesteps, features) -> (1, 7, 7)
        model_input = scaled_sequence.reshape(1, 7, 7)

        # Predict
        scaled_prediction = self.model.predict(model_input)

        # Inverse transform
        actual_prediction = self.scaler_target.inverse_transform(scaled_prediction)[0][0]

        # Target date is next day after the last input date
        last_date = request_data.data[-1].timestamp
        target_date = last_date + timedelta(days=1)

        category = self.get_aqi_category(actual_prediction)

        return {
            "predicted_aqi": float(actual_prediction),
            "target_date": target_date.isoformat(),
            "aqi_category": category,
            "model": "LSTM"
        }
