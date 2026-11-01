import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
});

// Interceptor for error handling (optional, but good practice)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const getLocations = async () => {
  const response = await api.get('/api/locations');
  return response.data;
};

export const getHistoricalData = async (locationId, days = 30) => {
  const response = await api.get(`/api/historical/${locationId}`, { params: { days } });
  return response.data;
};

export const getPredictionHistory = async (locationId) => {
  const response = await api.get(`/api/predictions/${locationId}`);
  return response.data;
};

export const generatePrediction = async (locationId) => {
  const response = await api.post(`/api/predictions/predict?locationId=${locationId}`);
  return response.data;
};

// ── Open-Meteo proxy endpoints (all calls stay in Spring Boot) ─────────────

export const searchLocations = async (query) => {
  const response = await api.get('/api/air-quality/search', { params: { query } });
  return response.data;
};

export const getLiveAirQuality = async (lat, lon) => {
  const response = await api.get('/api/air-quality/live', { params: { lat, lon } });
  return response.data;
};

export const get3DayForecast = async (lat, lon) => {
  const response = await api.get('/api/air-quality/forecast-3day', { params: { lat, lon } });
  return response.data;
};

export const reverseGeocode = async (lat, lon) => {
  const response = await api.get('/api/air-quality/reverse-geocode', { params: { lat, lon } });
  return response.data;
};

export default api;
