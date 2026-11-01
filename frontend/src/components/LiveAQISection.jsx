import React from 'react';
import { Wifi } from 'lucide-react';
import { getUSAQICategoryClass, getUSAQICategoryName } from '../utils/aqi';

/**
 * Displays the current air quality reading from Open-Meteo (via Spring Boot proxy).
 * Props:
 *   liveData   – LiveAirQualityDTO from /api/air-quality/live  (null = not loaded yet)
 *   loading    – boolean
 *   error      – string | null
 *   locationName – display name for the location
 */
const LiveAQISection = ({ liveData, loading, error, locationName }) => {
  // ── Helper: format a nullable number ─────────────────────────
  const fmt = (v, decimals = 1) =>
    v !== null && v !== undefined ? Number(v).toFixed(decimals) : '—';

  const pollutants = liveData
    ? [
        { label: 'PM2.5', value: fmt(liveData.pm25), unit: 'µg/m³' },
        { label: 'PM10',  value: fmt(liveData.pm10), unit: 'µg/m³' },
        { label: 'NO₂',   value: fmt(liveData.no2),  unit: 'µg/m³' },
        { label: 'CO',    value: fmt(liveData.co),   unit: 'µg/m³' },
        { label: 'SO₂',   value: fmt(liveData.so2),  unit: 'µg/m³' },
        { label: 'O₃',    value: fmt(liveData.o3),   unit: 'µg/m³' },
      ]
    : [];

  const usAqi     = liveData?.usAqi;
  const catClass  = usAqi != null ? getUSAQICategoryClass(usAqi) : '';
  const catName   = usAqi != null ? getUSAQICategoryName(usAqi)  : '';

  return (
    <div className="glass-card">
      {/* ── Section header ──────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Wifi size={20} style={{ color: 'var(--accent-color)' }} />
          <h2 style={{ margin: 0 }}>Live AQI (Open-Meteo)</h2>
        </div>
        {locationName && (
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {locationName}
          </span>
        )}
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
        Current atmospheric estimate for the selected coordinates · US AQI scale
      </p>

      {/* ── Loading ─────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center" style={{ minHeight: '120px', gap: '12px' }}>
          <div className="loader" />
          <span style={{ color: 'var(--text-secondary)' }}>Fetching live data…</span>
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────── */}
      {!loading && error && (
        <div style={{ color: 'var(--naqi-poor)', padding: '16px', textAlign: 'center' }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Data ────────────────────────────────────────────── */}
      {!loading && !error && liveData && (
        <>
          {/* AQI badge row */}
          <div className="flex items-center gap-4 mb-4" style={{ flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1 }}>
                {usAqi ?? '—'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>US AQI</div>
            </div>
            {usAqi != null && (
              <span className={`status-badge ${catClass}`}>{catName}</span>
            )}
            {liveData.timestamp && (
              <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Reading: {liveData.timestamp}
              </span>
            )}
          </div>

          {/* Pollutant grid */}
          <div className="grid grid-cols-3" style={{ gap: '12px' }}>
            {pollutants.map((p) => (
              <div
                key={p.label}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}
              >
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '6px' }}>
                  {p.label}
                </div>
                <div style={{ fontWeight: 600 }}>
                  {p.value}
                  <span style={{ fontSize: '0.7rem', marginLeft: '4px', color: 'var(--text-secondary)' }}>
                    {p.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── No data yet (no location selected) ─────────────── */}
      {!loading && !error && !liveData && (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
          Search for a city or use GPS to see live data.
        </div>
      )}
    </div>
  );
};

export default LiveAQISection;
