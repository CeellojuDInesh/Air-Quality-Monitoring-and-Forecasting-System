import React from 'react';
import { getNAQICategoryClass, getNAQICategoryName } from '../utils/aqi';

const PredictionHistory = ({ predictions, locationName }) => {
  const formatDateTime = (val) => {
    if (!val) return '—';
    try {
      return new Date(val).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return val;
    }
  };

  const formatDate = (val) => {
    if (!val) return '—';
    try {
      return new Date(val).toLocaleDateString([], { dateStyle: 'medium' });
    } catch {
      return val;
    }
  };

  if (!predictions || predictions.length === 0) {
    return (
      <div className="glass-card">
        <h2 className="mb-4">Prediction History</h2>
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          {locationName
            ? `No past LSTM predictions recorded for ${locationName}.`
            : 'No past predictions found for this location.'}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ overflowX: 'auto' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ margin: 0 }}>Prediction History</h2>
        {locationName && (
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Station: {locationName}
          </span>
        )}
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Generated On</th>
            <th>Target Date</th>
            <th>Predicted AQI</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {predictions.map((p) => {
            const aqi = Math.round(p.predictedAqi);
            return (
              <tr key={p.id}>
                <td>{formatDateTime(p.predictionDate || p.createdAt)}</td>
                <td>{formatDate(p.targetDate)}</td>
                <td style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>{aqi}</td>
                <td>
                  <span
                    className={`status-badge ${getNAQICategoryClass(aqi)}`}
                    style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                  >
                    {p.aqiCategory || getNAQICategoryName(aqi)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PredictionHistory;
