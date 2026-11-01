import os
import numpy as np
import joblib
import tensorflow as tf
from fastapi.testclient import TestClient
from src.main import app
import datetime

def run_check():
    print("Loading test data and scalers...")
    # Load raw resources
    X_test = np.load('data/processed/X_test.npy')
    scaler_features = joblib.load('data/processed/scaler_features.pkl')
    scaler_target = joblib.load('data/processed/scaler_target.pkl')
    model = tf.keras.models.load_model('models/lstm_aqi_model.keras')

    # Select the first sequence in the test set
    idx = 0
    test_sequence_scaled = X_test[idx:idx+1] # shape (1, 7, 7)

    print("1. Predicting directly via model...")
    pred_scaled_direct = model.predict(test_sequence_scaled, verbose=0)
    pred_actual_direct = scaler_target.inverse_transform(pred_scaled_direct)[0][0]
    print(f"Direct Model Prediction: {pred_actual_direct}")

    print("2. Formatting payload for FastAPI...")
    # Inverse transform the input sequence to raw features
    test_sequence_raw = scaler_features.inverse_transform(test_sequence_scaled[0])

    # Construct payload
    base_date = datetime.date(2019, 9, 5) # Test set starts at 2019-09-05 roughly
    data_payload = []
    for i in range(7):
        data_payload.append({
            "timestamp": (base_date + datetime.timedelta(days=i)).isoformat(),
            "PM2.5": float(test_sequence_raw[i, 0]),
            "PM10": float(test_sequence_raw[i, 1]),
            "NO2": float(test_sequence_raw[i, 2]),
            "CO": float(test_sequence_raw[i, 3]),
            "SO2": float(test_sequence_raw[i, 4]),
            "O3": float(test_sequence_raw[i, 5]),
            "AQI": float(test_sequence_raw[i, 6])
        })

    payload = {
        "location": "Hyderabad",
        "data": data_payload
    }

    print("3. Predicting via FastAPI endpoint...")
    with TestClient(app) as client:
        response = client.post("/predict", json=payload)

    assert response.status_code == 200, f"API failed: {response.text}"
    api_pred = response.json()["predicted_aqi"]
    print(f"FastAPI Prediction: {api_pred}")

    print("4. Comparing results...")
    diff = abs(pred_actual_direct - api_pred)
    print(f"Absolute Difference: {diff}")

    if diff < 1e-4:
        print("SUCCESS: Consistency Check Passed! Both flows use the identical logic.")
    else:
        print("ERROR: Inconsistency detected!")

if __name__ == "__main__":
    run_check()
