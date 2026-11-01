import React from 'react';
import { AlertTriangle } from 'lucide-react';

const Alerts = ({ latestPrediction }) => {
  if (!latestPrediction) return null;

  const aqi = latestPrediction.predictedAqi;
  // Show alert if predicted AQI is Poor (>200) or worse
  if (aqi <= 200) return null;

  let message = '';
  if (aqi > 400) {
    message = 'SEVERE ALERT: Air quality predicted to reach hazardous levels. Health warning of emergency conditions.';
  } else if (aqi > 300) {
    message = 'VERY POOR ALERT: Health alert! Everyone may experience more serious health effects.';
  } else {
    message = 'POOR ALERT: Members of sensitive groups may experience health effects.';
  }

  return (
    <div className="alert-card">
      <AlertTriangle className="alert-icon" size={24} />
      <div>
        <h3 style={{ margin: '0 0 4px 0', color: 'var(--naqi-poor)' }}>Air Quality Warning</h3>
        <p style={{ margin: 0, color: 'inherit' }}>{message} (Predicted AQI: {Math.round(aqi)})</p>
      </div>
    </div>
  );
};

export default Alerts;
