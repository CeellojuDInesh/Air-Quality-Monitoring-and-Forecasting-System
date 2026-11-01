import React, { useState, useEffect } from 'react';
import { generatePrediction } from '../services/api';
import { getNAQICategoryClass, getNAQICategoryName } from '../utils/aqi';
import { Zap, AlertCircle } from 'lucide-react';

/**
 * LSTM AI Prediction Section
 * Represents: Next-day AQI predicted by custom LSTM Model 1
 * Scale: Indian National AQI (NAQI)
 */
const PredictionSection = ({ locationId, locationName, latestPrediction, onPredictionGenerated }) => {
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [activePrediction, setActivePrediction] = useState(latestPrediction || null);

  // Sync with prop when location or history changes
  useEffect(() => {
    setActivePrediction(latestPrediction || null);
    setError(null);
  }, [latestPrediction, locationId]);

  const handlePredict = async () => {
    if (!locationId) {
      setError(`Historical records are unavailable for ${locationName || 'this location'}. LSTM predictions require 7 historical station records.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await generatePrediction(locationId);
      setActivePrediction(data);
      if (onPredictionGenerated) {
        onPredictionGenerated(data);
      }
    } catch (err) {
      console.error('Prediction generation error:', err);
      const serverMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      setError(serverMsg || 'Failed to generate LSTM prediction.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="glass-card flex flex-col justify-between" style={{ minHeight: '260px' }}>
      <div>
        <div className="flex items-center gap-2" style={{ marginBottom: '4px' }}>
          <Zap size={16} style={{ color: '#eab308' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>LSTM AI Prediction</h3>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          Next-day AQI predicted by custom LSTM model
        </p>

        {/* Backend / validation error */}
        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '10px 12px',
              marginBottom: '12px',
              fontSize: '0.8rem',
              color: '#fca5a5',
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-start',
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        {/* Prediction Display */}
        {activePrediction && !error && (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '14px',
              borderRadius: '8px',
              marginBottom: '14px',
              textAlign: 'center',
            }}
          >
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '6px' }}>
              Target Date: {formatDate(activePrediction.targetDate)}
            </div>
            <div style={{ fontSize: '2.25rem', fontWeight: 700, margin: '4px 0 8px 0', lineHeight: 1 }}>
              {Math.round(activePrediction.predictedAqi)}
            </div>
            <span className={`status-badge ${getNAQICategoryClass(activePrediction.predictedAqi)}`}>
              {activePrediction.aqiCategory || getNAQICategoryName(activePrediction.predictedAqi)}
            </span>
          </div>
        )}

        {!activePrediction && !error && (
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            {locationId
              ? `Click below to generate a next-day prediction from the latest 7 historical records of ${locationName || 'this station'}.`
              : `Historical data is unavailable for ${locationName || 'this location'}. Custom LSTM predictions are currently available for Hyderabad.`}
          </p>
        )}
      </div>

      <button
        className="btn-primary"
        onClick={handlePredict}
        disabled={loading}
        title={!locationId ? 'Historical station data unavailable for this location' : 'Generate LSTM prediction'}
        style={{ width: '100%', marginTop: '8px', opacity: !locationId ? 0.7 : 1 }}
      >
        {loading ? (
          <span className="loader" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
        ) : (
          <Zap size={16} />
        )}
        {loading ? 'Analyzing with LSTM…' : 'Generate Prediction'}
      </button>
    </div>
  );
};

export default PredictionSection;
