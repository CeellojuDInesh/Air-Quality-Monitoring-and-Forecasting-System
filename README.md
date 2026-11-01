# Air Quality Monitoring & Forecasting Platform

A full-stack, AI-powered Air Quality Monitoring and Forecasting Platform. The application provides real-time live atmospheric readings, 3-day weather-integrated atmospheric forecasts, historical ground station analytics, and next-day AI air quality predictions powered by a custom Deep Learning LSTM model.

---

## Architecture Overview

```
                      ┌─────────────────────────────────────────┐
                      │          React + Vite Frontend          │
                      │         (http://localhost:5173)         │
                      └────────────────────┬────────────────────┘
                                           │ HTTP REST / JSON
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │       Spring Boot API Gateway (4.x)     │
                      │         (http://localhost:8080)         │
                      └──────┬───────────────────┬──────────────┘
                             │                   │
         Open-Meteo REST API │                   │ Internal Microservice Call
                             ▼                   ▼
       ┌───────────────────────────┐   ┌───────────────────────────┐
       │   Open-Meteo Public APIs  │   │     FastAPI ML Service    │
       │ (Air Quality & Geocoding) │   │  (http://localhost:8000)  │
       └───────────────────────────┘   └─────────────┬─────────────┘
                                                     │ Model Inference
                                                     ▼
                                       ┌───────────────────────────┐
                                       │   TensorFlow/Keras LSTM   │
                                       │   (lstm_aqi_model.keras)  │
                                       └───────────────────────────┘
                             │
                             ▼
              ┌─────────────────────────────┐
              │    MySQL Database (8.0+)    │
              │       (air_quality_db)      │
              └─────────────────────────────┘
```

> **Design Principle:** Spring Boot serves as the secure backend gateway. The React frontend interacts solely with Spring Boot; it never communicates directly with external APIs or the internal FastAPI machine learning service.

---

## Key Features

1. **Live Air Quality (Open-Meteo Integration):**
   - Real-time atmospheric estimates for PM2.5, PM10, NO₂, CO, SO₂, O₃, and US AQI.
   - Compliant with official **US EPA AQI categories** (*Good*, *Moderate*, *Unhealthy for Sensitive Groups*, *Unhealthy*, *Very Unhealthy*, *Hazardous*).

2. **3-Day Air Quality Forecast (Open-Meteo):**
   - Calendar-aligned 3-day atmospheric forecast for any selected location or GPS coordinates.
   - Daily peak US AQI and pollutant concentrations.

3. **GPS Geolocation & Global City Search:**
   - One-click **"Use My Location"** with reverse-geocoding to identify neighborhood and city names (e.g., *Balanagar, Hyderabad*).
   - Instant search bar with debounced suggestions for cities worldwide.

4. **Interactive Geospatial Map (Leaflet):**
   - Automatically re-centers and renders markers on active GPS or searched coordinates with popup air quality details.

5. **Historical Ground Station Records:**
   - 30-day historical trends and pollutant concentrations from verified ground monitoring stations.
   - Evaluated on the **Indian National AQI (NAQI)** scale.

6. **Deep Learning LSTM Prediction (Model 1):**
   - Predicts next-day AQI using a 7-day chronological sliding window across 7 ground pollutant features (`PM2.5`, `PM10`, `NO2`, `CO`, `SO2`, `O3`, `AQI`).
   - "Generate Prediction" trigger immediately updates the UI and persists the prediction to the database history.

7. **Flexible Station Association:**
   - When viewing GPS or custom coordinates, users can link a ground monitoring station (e.g., Hyderabad) to view historical data and AI forecasts while keeping the live GPS readings and map focused on their exact location.

---

## Technologies Used

| Tier | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite, Vanilla CSS3 (Glassmorphism) | Fast, responsive Single Page Application (SPA) |
| **Visualizations** | Recharts, Leaflet, React-Leaflet, Lucide React | AQI trend charts, interactive maps, modern icons |
| **Backend Gateway** | Java 17, Spring Boot 4.x / 3.x, Spring Data JPA | Secure REST API, CORS configuration, external API proxy |
| **Database** | MySQL 8.0+, Hibernate ORM, HikariCP | Persistence for locations, historical records, and prediction history |
| **Machine Learning** | Python 3.10+, FastAPI, Uvicorn, TensorFlow / Keras | Asynchronous REST prediction service, LSTM neural network inference |
| **Preprocessing** | Scikit-Learn (MinMaxScaler), Pandas, NumPy | Leakage-free feature scaling and sequence shaping |
| **External APIs** | Open-Meteo Air Quality & Geocoding APIs | Live atmospheric air quality estimates and reverse geocoding |

---

## Project Structure

```
Air Quality/
├── .env.example                 # Root environment template for all services
├── .gitignore                   # Multi-stack gitignore (Java, React, Python, OS)
├── README.md                    # Project documentation & setup instructions
│
├── backend/                     # Spring Boot Application
│   ├── pom.xml                  # Maven dependencies & build configuration
│   ├── seed_db.py               # Database seeder script for historical data
│   ├── requirements-seed.txt    # Python dependencies for the seed script
│   └── src/
│       ├── main/
│       │   ├── java/com/airquality/backend/
│       │   │   ├── config/      # CORS and RestTemplate configuration
│       │   │   ├── controller/  # REST endpoints (Live, Historical, Prediction, Location)
│       │   │   ├── dto/         # Request & response data transfer objects
│       │   │   ├── entity/      # JPA entities (Location, HistoricalData, PredictionRecord)
│       │   │   ├── repository/  # Spring Data JPA repositories
│       │   │   └── service/     # Business logic, OpenMeteo proxy, FastAPI client
│       │   └── resources/
│       │       ├── application.yml          # Spring Boot configuration with env overrides
│       │       └── application.yml.example  # Configuration template
│       └── test/                # Integration and MockMvc tests
│
├── frontend/                    # React + Vite Application
│   ├── .env.example             # Frontend environment template (VITE_API_BASE_URL)
│   ├── package.json             # NPM dependencies & scripts
│   ├── vite.config.js           # Vite build configuration
│   └── src/
│       ├── components/          # Header, Map, PredictionCard, LiveAQI, Forecast, etc.
│       ├── pages/               # Main Dashboard page
│       ├── services/            # Axios API service
│       ├── utils/               # US EPA & Indian NAQI scale helper functions
│       └── index.css            # Custom CSS styling tokens & glassmorphism theme
│
└── ml-service/                  # FastAPI & TensorFlow LSTM Microservice
    ├── requirements.txt         # Python dependencies (FastAPI, TensorFlow, etc.)
    ├── data/
    │   ├── raw/                 # city_day.csv (historical station observations)
    │   └── processed/           # Fitted MinMaxScaler artifacts & preprocessed arrays
    ├── models/
    │   └── lstm_aqi_model.keras # Trained Keras LSTM Model 1 (~409 KB)
    ├── src/
    │   ├── main.py              # FastAPI application & endpoints (/health, /predict)
    │   ├── predictor.py         # Model loader, scaler transform, and inference logic
    │   └── schemas.py           # Pydantic validation schemas
    └── training/                # Model architecture training scripts and evaluations
```

---

## Machine Learning Model Information

- **Model Type:** Deep Long Short-Term Memory (LSTM) Recurrent Neural Network.
- **Model File:** `ml-service/models/lstm_aqi_model.keras` (~409 KB).
- **Scalers:** `scaler_features.pkl` and `scaler_target.pkl` in `ml-service/data/processed/`.
- **Input Dimension:** 3D Tensor `(batch_size, 7, 7)` representing 7 consecutive chronological daily records with 7 features:
  1. `PM2.5`
  2. `PM10`
  3. `NO2`
  4. `CO`
  5. `SO2`
  6. `O3`
  7. `AQI`
- **Output:** Predicted next-day continuous AQI value mapped to categorical NAQI buckets.
- **Integrity Guarantee:** Model 1 weights and feature scaler pipelines are strictly preserved.

---

## Prerequisites

Before setting up the project, ensure you have the following installed:

- **Java Development Kit (JDK):** Version 17 or higher
- **Apache Maven:** Version 3.8+ (or use the included `mvnw`)
- **Node.js:** Version 18.x or higher and `npm`
- **Python:** Version 3.10 or 3.11
- **MySQL Server:** Version 8.0 or higher
- **Git**

---

## Step-by-Step Setup Guide

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "Air Quality"
```

### 2. MySQL Database Setup

1. Start your local MySQL service.
2. Log into MySQL and create the database:
   ```sql
   CREATE DATABASE IF NOT EXISTS air_quality_db;
   ```
3. Set your database credentials as environment variables (or update `backend/src/main/resources/application.yml`):
   ```bash
   # Windows (PowerShell)
   $env:DB_USERNAME = "root"
   $env:DB_PASSWORD = "your_mysql_password"

   # Linux / macOS (Bash)
   export DB_USERNAME="root"
   export DB_PASSWORD="your_mysql_password"
   ```

### 3. Seed Historical Station Data

The repository includes `ml-service/data/raw/city_day.csv` (published under **CC0: Public Domain** from CPCB India records).

Install the seed dependencies and execute the script:
```bash
cd backend
pip install -r requirements-seed.txt
python seed_db.py
cd ..
```
*This inserts the monitored station record (Hyderabad) along with over 2,000 chronological daily records into `historical_data`.*

---

### 4. Start the FastAPI ML Service

1. Navigate to `ml-service`:
   ```bash
   cd ml-service
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server on port 8000:
   ```bash
   uvicorn src.main:app --host 0.0.0.0 --port 8000
   ```
5. Verify health:
   Navigate to `http://localhost:8000/health` in your browser. Expected response:
   ```json
   { "status": "healthy", "model_loaded": true }
   ```

---

### 5. Start the Spring Boot Backend

1. In a new terminal, navigate to `backend`:
   ```bash
   cd backend
   ```
2. Ensure `DB_USERNAME` and `DB_PASSWORD` are set in your environment if different from defaults.
3. Build and run:
   ```bash
   mvn clean spring-boot:run
   ```
4. Verify backend status:
   Navigate to `http://localhost:8080/api/locations`. Expected response:
   ```json
   [
     {
       "id": 1,
       "cityName": "Hyderabad",
       "latitude": 17.385,
       "longitude": 78.4867
     }
   ]
   ```

---

### 6. Start the React Frontend

1. In a third terminal, navigate to `frontend`:
   ```bash
   cd frontend
   ```
2. Create `.env` from template (optional, defaults to port 8080):
   ```bash
   cp .env.example .env
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Launch Vite development server:
   ```bash
   npm run dev
   ```
5. Open your browser at **`http://localhost:5173`**.

---

## API Endpoints Reference

### Spring Boot Gateway (`http://localhost:8080`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/locations` | Retrieve all monitored ground stations from MySQL |
| `GET` | `/api/historical/{locationId}?days=30` | Retrieve descending historical records for a station |
| `POST` | `/api/predictions/predict?locationId={id}` | Generate next-day prediction via FastAPI & persist to DB |
| `GET` | `/api/predictions/{locationId}` | Retrieve past prediction history in descending date order |
| `GET` | `/api/air-quality/live?lat={lat}&lon={lon}` | Proxy Open-Meteo live atmospheric AQI & pollutants |
| `GET` | `/api/air-quality/forecast-3day?lat={lat}&lon={lon}`| Proxy Open-Meteo 3-day atmospheric forecast |
| `GET` | `/api/air-quality/search?query={city}` | Proxy Open-Meteo geocoding search suggestions |
| `GET` | `/api/air-quality/reverse-geocode?lat={lat}&lon={lon}` | Reverse geocode coordinates to location/neighborhood name |

### FastAPI Service (`http://localhost:8000`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Healthcheck and LSTM model load status |
| `POST` | `/predict` | Ingests 7-day feature sequence; scales, predicts, and inverses transform |

---

## Dataset Licensing & Attribution

- **Dataset:** *Air Quality Data in India (2015–2020)*
- **Source:** Central Pollution Control Board (CPCB), Ministry of Environment, Forest and Climate Change, Government of India.
- **License:** **Creative Commons Zero (CC0): Public Domain**.
- The historical dataset file (`city_day.csv`, ~2.57 MB) is included directly in `ml-service/data/raw/` for seamless offline seeding.

---

## Security Notes

- Configuration files (`application.yml`, `.env`, `seed_db.py`) use environment variables with placeholder defaults (`your_password_here`).
- Sensitive local files (`node_modules/`, `target/`, `venv/`, `__pycache__/`, `*.log`, local IDE directories) are strictly excluded via the root `.gitignore`.
- Model artifacts (`*.keras`, `*.pkl`) are well under GitHub's 100 MB file limit and require no Git LFS.
