import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import AQISummary from '../components/AQISummary';
import PollutantCards from '../components/PollutantCards';
import AQIHistoryChart from '../components/AQIHistoryChart';
import PredictionSection from '../components/PredictionSection';
import PredictionHistory from '../components/PredictionHistory';
import AQIMap from '../components/AQIMap';
import Alerts from '../components/Alerts';
import AreaComparison from '../components/AreaComparison';
import LiveAQISection from '../components/LiveAQISection';
import ForecastSection from '../components/ForecastSection';
import {
  getLocations,
  getHistoricalData,
  getPredictionHistory,
  getLiveAirQuality,
  get3DayForecast,
} from '../services/api';

const Dashboard = () => {
  // ── DB-backed state (existing) ────────────────────────────────
  const [locations, setLocations]                   = useState([]);
  const [selectedLocation, setSelectedLocation]     = useState(null);
  const [historicalData, setHistoricalData]         = useState([]);
  const [predictions, setPredictions]               = useState([]);
  const [loadingLocations, setLoadingLocations]     = useState(true);
  const [loadingData, setLoadingData]               = useState(false);
  const [error, setError]                           = useState(null);

  // ── Open-Meteo live state ─────────────────────────────────────
  const [activeCoords, setActiveCoords]             = useState(null);
  const [liveData, setLiveData]                     = useState(null);
  const [forecast, setForecast]                     = useState([]);
  const [liveLoading, setLiveLoading]               = useState(false);
  const [liveError, setLiveError]                   = useState(null);
  const [forecastLoading, setForecastLoading]       = useState(false);
  const [forecastError, setForecastError]           = useState(null);

  // ── Load DB locations on mount ────────────────────────────────
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const data = await getLocations();
        const locList = Array.isArray(data) ? data : [];
        setLocations(locList);
        setError(null);
        if (locList.length > 0) {
          const firstLoc = locList[0];
          setSelectedLocation(firstLoc);
          if (firstLoc?.latitude && firstLoc?.longitude) {
            setActiveCoords({
              lat: firstLoc.latitude,
              lon: firstLoc.longitude,
              name: firstLoc.cityName,
            });
          }
        }
      } catch (err) {
        console.error('Failed to load locations:', err);
        const status = err.response?.status;
        const statusText = err.response?.statusText || '';
        const serverMsg = err.response?.data?.message || err.response?.data?.error || '';
        const isNetworkErr = err.code === 'ERR_NETWORK' || !err.response;

        setError({
          type: isNetworkErr ? 'NETWORK_ERROR' : 'API_ERROR',
          status: status || null,
          title: isNetworkErr
            ? 'Backend Connection Failed'
            : `API Error ${status ? '(HTTP ' + status + ')' : ''}`,
          message: isNetworkErr
            ? `Unable to connect to Spring Boot at ${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}.`
            : `Request to GET /api/locations failed: ${serverMsg || statusText || err.message}`,
          details: isNetworkErr
            ? 'The browser blocked the request or the server is not reachable. Ensure Spring Boot is running on port 8080 with CORS enabled for ' + window.location.origin + '.'
            : (serverMsg ? `Server response: ${serverMsg}` : `Status text: ${statusText}`),
          raw: err.message,
        });
      } finally {
        setLoadingLocations(false);
      }
    };
    fetchLocations();
  }, []);

  // ── Load historical + LSTM predictions when DB location changes ─
  useEffect(() => {
    if (!selectedLocation || !selectedLocation.id) {
      setHistoricalData([]);
      setPredictions([]);
      return;
    }
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [histData, predData] = await Promise.all([
          getHistoricalData(selectedLocation.id, 30),
          getPredictionHistory(selectedLocation.id),
        ]);
        setHistoricalData(histData || []);
        setPredictions(predData || []);
      } catch (err) {
        console.error('Error fetching station data:', err);
        const serverMsg = err.response?.data?.message || err.response?.data?.error || err.message;
        setError({
          title: 'Station Data Error',
          message: `Failed to load historical records for ${selectedLocation.cityName}.`,
          details: serverMsg,
          raw: err.message,
        });
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [selectedLocation]);

  // ── Fetch live AQ + forecast when activeCoords changes ────────
  useEffect(() => {
    if (!activeCoords) return;

    let cancelled = false;

    const fetchLive = async () => {
      setLiveLoading(true);
      setLiveError(null);
      try {
        const data = await getLiveAirQuality(activeCoords.lat, activeCoords.lon);
        if (!cancelled) setLiveData(data);
      } catch (e) {
        if (!cancelled) {
          const msg = e.response?.data?.error || e.message;
          setLiveError(`Live data unavailable: ${msg}`);
        }
      } finally {
        if (!cancelled) setLiveLoading(false);
      }
    };

    const fetchForecast = async () => {
      setForecastLoading(true);
      setForecastError(null);
      try {
        const data = await get3DayForecast(activeCoords.lat, activeCoords.lon);
        if (!cancelled) setForecast(data || []);
      } catch (e) {
        if (!cancelled) {
          const msg = e.response?.data?.error || e.message;
          setForecastError(`Forecast unavailable: ${msg}`);
        }
      } finally {
        if (!cancelled) setForecastLoading(false);
      }
    };

    fetchLive();
    fetchForecast();

    return () => { cancelled = true; };
  }, [activeCoords]);

  // Called when user selects a location from the DB dropdown
  const handleDbLocationChange = (loc) => {
    setSelectedLocation(loc);
    if (loc?.latitude && loc?.longitude) {
      setActiveCoords({ lat: loc.latitude, lon: loc.longitude, name: loc.cityName });
    }
  };

  // Called when user picks a search result or uses GPS
  const handleCoordsChange = (coords) => {
    setActiveCoords(coords);
    setLiveData(null);
    setForecast([]);

    // Check if coords.name matches any DB monitored station
    const matchedLoc = locations.find(
      l => l.cityName.toLowerCase() === (coords.name || '').toLowerCase()
    );
    if (matchedLoc) {
      setSelectedLocation(matchedLoc);
    } else {
      setSelectedLocation(null);
      setHistoricalData([]);
      setPredictions([]);
    }
  };

  // Associate Hyderabad ground station for historical data & LSTM while keeping activeCoords (Balanagar) unchanged
  const handleAssociateHyderabadStation = async () => {
    let hydStation = locations.find(
      l => l.cityName.toLowerCase() === 'hyderabad'
    );
    if (!hydStation) {
      try {
        const freshLocations = await getLocations();
        const list = Array.isArray(freshLocations) ? freshLocations : [];
        setLocations(list);
        hydStation = list.find(l => l.cityName.toLowerCase() === 'hyderabad') || list[0];
      } catch (e) {
        console.error('Failed to load locations', e);
      }
    }
    if (!hydStation) return;

    setSelectedLocation(hydStation);
    setLoadingData(true);
    try {
      const [histData, predData] = await Promise.all([
        getHistoricalData(hydStation.id, 30),
        getPredictionHistory(hydStation.id),
      ]);
      setHistoricalData(histData || []);
      setPredictions(predData || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching station data:', err);
      const serverMsg = err.response?.data?.message || err.response?.data?.error || err.message;
      setError({
        title: 'Station Data Error',
        message: `Failed to load historical records for ${hydStation.cityName}.`,
        details: serverMsg,
        raw: err.message,
      });
    } finally {
      setLoadingData(false);
    }
  };

  // Return to GPS-only view (unassociates ground station, retains GPS coordinates)
  const handleReturnToGpsOnly = () => {
    setSelectedLocation(null);
    setHistoricalData([]);
    setPredictions([]);
  };

  const refreshPredictions = async () => {
    if (!selectedLocation || !selectedLocation.id) return;
    try {
      const predData = await getPredictionHistory(selectedLocation.id);
      setPredictions(predData || []);
    } catch (err) {
      console.error('Failed to refresh predictions', err);
    }
  };

  // ── Full-page loading state ───────────────────────────────────
  if (loadingLocations) {
    return (
      <div className="full-page-loader">
        <div className="loader" />
        <p>Loading Air Quality Platform…</p>
      </div>
    );
  }

  // ── Connection failure (only if an actual error occurred and no locations loaded) ──
  if (error && locations.length === 0) {
    return (
      <div className="full-page-loader text-center" style={{ maxWidth: '640px', margin: '0 auto', padding: '24px' }}>
        <h2 style={{ color: 'var(--naqi-poor)', marginBottom: '12px' }}>{error.title}</h2>
        <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
          {error.message}
        </p>
        {error.details && (
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
            {error.details}
          </p>
        )}
        {error.raw && (
          <code style={{ display: 'inline-block', background: 'rgba(255,255,255,0.06)', padding: '6px 14px', borderRadius: '6px', fontSize: '0.825rem', color: '#fca5a5', marginBottom: '20px' }}>
            {error.raw}
          </code>
        )}
        <div>
          <button className="btn-primary" onClick={() => window.location.reload()} style={{ margin: '0 auto' }}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const latestHistoricalData = historicalData.length > 0 ? historicalData[0] : null;
  const sortedPredictions    = [...predictions].sort((a, b) => new Date(b.targetDate) - new Date(a.targetDate));
  const latestPrediction     = sortedPredictions.length > 0 ? sortedPredictions[0] : null;

  // Display name shown in Header subtitle
  const displayName = activeCoords?.name || selectedLocation?.cityName || null;

  return (
    <div className="container">

      {/* ═══════════════════════════════════════════════════════
          Header — search + GPS + DB location selector
          ═══════════════════════════════════════════════════════ */}
      <Header
        locations={locations}
        selectedLocation={activeCoords?.name === selectedLocation?.cityName ? selectedLocation : null}
        onLocationChange={handleDbLocationChange}
        onCoordsChange={handleCoordsChange}
        displayName={displayName}
      />

      {/* LSTM alert banner */}
      <Alerts latestPrediction={latestPrediction} />

      {/* ═══════════════════════════════════════════════════════
          SECTION A: Open-Meteo Live Data (search / GPS / active)
          ═══════════════════════════════════════════════════════ */}
      {(activeCoords || liveLoading) && (
        <div className="grid grid-cols-2 mb-4" style={{ alignItems: 'start' }}>
          <LiveAQISection
            liveData={liveData}
            loading={liveLoading}
            error={liveError}
            locationName={activeCoords?.name}
          />
          <ForecastSection
            forecast={forecast}
            loading={forecastLoading}
            error={forecastError}
            locationName={activeCoords?.name}
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          SECTION B: Historical / LSTM data (DB-backed)
          ═══════════════════════════════════════════════════════ */}
      {loadingData ? (
        <div className="glass-card flex flex-col items-center justify-center" style={{ minHeight: '300px' }}>
          <div className="loader" style={{ marginBottom: '16px' }} />
          <p>Fetching historical data…</p>
        </div>
      ) : (
        <>
          {/* Divider label to separate live vs historical */}
          <div className="section-divider">
            <span>
              {selectedLocation?.id
                ? `Historical Ground Station Data & LSTM Prediction — ${selectedLocation.cityName}`
                : 'Historical Ground Station Data & LSTM Prediction'}
            </span>
          </div>

          {/* Association Banner: shown when live coordinates differ from the historical ground station */}
          {selectedLocation?.id && activeCoords?.name && activeCoords.name !== selectedLocation.cityName && (
            <div
              className="glass-card mb-4"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '12px',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Active GPS Coordinates
                  </span>
                  <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                    Live Location: {activeCoords.name}
                  </strong>
                </div>
                <div style={{ height: '28px', width: '1px', background: 'var(--surface-border)' }} />
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Database Ground Station
                  </span>
                  <strong style={{ fontSize: '1rem', color: 'var(--accent-color)' }}>
                    Historical & AI Forecast Source: {selectedLocation.cityName} Ground Station
                  </strong>
                </div>
              </div>

              <button
                className="btn-secondary"
                onClick={handleReturnToGpsOnly}
                style={{
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid var(--surface-border)',
                  color: 'var(--text-primary)',
                }}
                title="Return to GPS-only view"
              >
                Return to GPS-only view
              </button>
            </div>
          )}

          {error && (
            <div className="alert-card" style={{ marginBottom: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: 'var(--naqi-poor)' }}>{error.title}</h4>
                <p style={{ margin: 0 }}>{error.message} {error.details ? `— ${error.details}` : ''}</p>
              </div>
            </div>
          )}

          {selectedLocation?.id ? (
            <>
              {/* Row 1: AQI summary + LSTM prediction + pollutant cards */}
              <div className="grid grid-cols-4 mb-4">
                <div className="grid col-span-1" style={{ gridTemplateColumns: '1fr' }}>
                  <AQISummary latestData={latestHistoricalData} locationName={selectedLocation?.cityName} />
                  <PredictionSection
                    locationId={selectedLocation?.id}
                    locationName={selectedLocation?.cityName}
                    latestPrediction={latestPrediction}
                    onPredictionGenerated={(newPred) => {
                      if (newPred) {
                        setPredictions(prev => [newPred, ...prev.filter(p => p.id !== newPred.id)]);
                      } else {
                        refreshPredictions();
                      }
                    }}
                  />
                </div>
                <div className="col-span-3">
                  <PollutantCards latestData={latestHistoricalData} locationName={selectedLocation?.cityName} />
                </div>
              </div>

              {/* Row 2: AQI trend chart + map */}
              <div className="grid grid-cols-2 mb-4">
                <AQIHistoryChart data={historicalData} locationName={selectedLocation?.cityName} />
                <AQIMap
                  activeCoords={activeCoords}
                  location={selectedLocation}
                  latestData={latestHistoricalData}
                  liveData={liveData}
                />
              </div>

              {/* Row 3: Prediction history + area comparison */}
              <div className="grid grid-cols-3">
                <div className="col-span-2">
                  <PredictionHistory predictions={sortedPredictions} locationName={selectedLocation?.cityName} />
                </div>
                <div className="col-span-1">
                  <AreaComparison selectedLocation={selectedLocation} allLocations={locations} />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* For searched / GPS locations without DB station records */}
              <div className="grid grid-cols-2 mb-4">
                <AQIMap
                  activeCoords={activeCoords}
                  location={selectedLocation}
                  latestData={null}
                  liveData={liveData}
                />
                <div className="glass-card flex flex-col justify-center" style={{ padding: '24px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Live Location: {activeCoords?.name || 'Current GPS Location'}
                    </span>
                  </div>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '1.15rem' }}>
                    No Ground Station Records for {activeCoords?.name || selectedLocation?.cityName || 'This Location'}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '16px' }}>
                    The custom LSTM AI Forecasting model requires 7 consecutive days of verified ground monitoring station records (PM2.5, PM10, NO2, CO, SO2, O3, AQI) stored in our database.
                    <br /><br />
                    Currently, verified station records are available for monitored stations such as <strong>Hyderabad</strong>. Open-Meteo live atmospheric estimates and 3-day forecasts are available above for {activeCoords?.name || 'your location'}.
                  </p>
                  <div>
                    <button
                      className="btn-primary"
                      onClick={handleAssociateHyderabadStation}
                    >
                      View Hyderabad Station Data & AI Forecast
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
