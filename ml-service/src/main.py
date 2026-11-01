from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from src.schemas import PredictionRequest, PredictionResponse, ModelInfo
from src.predictor import AQIPredictor
import os

app = FastAPI(
    title="Air Quality Prediction ML Service",
    description="FastAPI service serving the LSTM model for AQI prediction.",
    version="1.0.0"
)

# Configure CORS for integration with Spring Boot backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"], # Expected Spring Boot origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize predictor
predictor = None

@app.on_event("startup")
async def startup_event():
    global predictor
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    model_path = os.path.join(base_dir, 'models', 'lstm_aqi_model.keras')
    scaler_features_path = os.path.join(base_dir, 'data', 'processed', 'scaler_features.pkl')
    scaler_target_path = os.path.join(base_dir, 'data', 'processed', 'scaler_target.pkl')

    try:
        predictor = AQIPredictor(model_path, scaler_features_path, scaler_target_path)
    except Exception as e:
        print(f"Error loading model resources: {e}")
        # We don't exit to allow /health to report failure in tests/monitoring

@app.get("/health")
async def health_check():
    model_loaded = predictor is not None and predictor.model is not None
    return {
        "status": "healthy" if model_loaded else "degraded",
        "model_loaded": model_loaded
    }

@app.get("/model/info", response_model=ModelInfo)
async def get_model_info():
    if not predictor or not predictor.model:
        raise HTTPException(status_code=503, detail="Model is not loaded.")

    return ModelInfo(
        model_type="LSTM",
        input_window_days=7,
        features=["PM2.5", "PM10", "NO2", "CO", "SO2", "O3", "AQI"],
        target="AQI (Next Day)",
        version="1.0"
    )

@app.post("/predict", response_model=PredictionResponse)
async def predict_aqi(request: PredictionRequest):
    if not predictor or not predictor.model:
        raise HTTPException(status_code=503, detail="Model is not loaded.")

    try:
        result = predictor.predict(request)
        result["location"] = request.location
        return PredictionResponse(**result)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Prediction error: {str(e)}")
