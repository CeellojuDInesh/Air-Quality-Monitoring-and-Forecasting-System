import React from 'react';
import { CalendarDays } from 'lucide-react';
import { getUSAQICategoryClass, getUSAQICategoryName } from '../utils/aqi';

/**
 * Displays the 3-day air quality forecast from Open-Meteo (via Spring Boot proxy).
 * Props:
 *   forecast     – Array<ForecastDayDTO> from /api/air-quality/forecast-3day
 *   loading      – boolean
 *   error        – string | null
 *   locationName – display name for the location
 */
const ForecastSection = ({ forecast, loading, error, locationName }) => {
  const fmt = (v, d = 1) =>
    v !== null && v !== undefined ? Number(v).toFixed(d) : '—';

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="glass-card">
      {/* ── Section header ──────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <CalendarDays size={20} style={{ color: 'var(--accent-color)' }} />
          <h2 style={{ margin: 0 }}>Open-Meteo 3-Day Forecast</h2>
        </div>
        {locationName && (
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {locationName}
          </span>
        )}
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
        Daily peak atmospheric forecast for the selected coordinates · US AQI scale
      </p>

      {/* ── Loading ─────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center" style={{ minHeight: '100px', gap: '12px' }}>
          <div className="loader" />
          <span style={{ color: 'var(--text-secondary)' }}>Loading forecast…</span>
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────── */}
      {!loading && error && (
        <div style={{ color: 'var(--naqi-poor)', padding: '16px', textAlign: 'center' }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Forecast cards ──────────────────────────────────── */}
      {!loading && !error && forecast && forecast.length > 0 && (
        <div className="grid grid-cols-3" style={{ gap: '16px' }}>
          {forecast.map((day) => {
            const aqi = day.usAqi;
            const catClass = aqi != null ? getUSAQICategoryClass(aqi) : '';
            const catName  = aqi != null ? getUSAQICategoryName(aqi)  : 'N/A';

            return (
              <div
                key={day.date}
                className="forecast-card"
              >
                {/* Date */}
                <div className="forecast-date">{formatDate(day.date)}</div>

                {/* AQI value */}
                <div className="forecast-aqi">{aqi ?? '—'}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  US AQI
                </div>

                {/* Category badge */}
                <span className={`status-badge ${catClass}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                  {catName}
                </span>

                {/* Pollutant mini-table */}
                <div style={{ marginTop: '12px', width: '100%' }}>
                  {[
                    { label: 'PM2.5', value: fmt(day.pm25), unit: 'µg/m³' },
                    { label: 'PM10',  value: fmt(day.pm10), unit: 'µg/m³' },
                  ].map((p) => (
                    <div
                      key={p.label}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '4px 0',
                        borderBottom: '1px solid var(--surface-border)',
                        fontSize: '0.8rem',
                      }}
                    >
                      <span style={{ color: 'var(--text-secondary)' }}>{p.label}</span>
                      <span>
                        {p.value}
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginLeft: '3px' }}>
                          {p.unit}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────── */}
      {!loading && !error && (!forecast || forecast.length === 0) && (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
          Search for a city or use GPS to see the forecast.
        </div>
      )}
    </div>
  );
};

export default ForecastSection;
