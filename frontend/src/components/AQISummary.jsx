import React from 'react';
import { Database } from 'lucide-react';
import { getNAQICategoryClass, getNAQICategoryName } from '../utils/aqi';

/**
 * Historical AQI Summary
 * Represents: Latest available record from the selected location's historical database records.
 * Scale: Indian National AQI (NAQI)
 */
const AQISummary = ({ latestData, locationName }) => {
  if (!latestData) {
    return (
      <div className="glass-card flex flex-col items-center justify-center text-center" style={{ minHeight: '220px' }}>
        <Database size={24} style={{ color: 'var(--text-secondary)', marginBottom: '8px' }} />
        <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem' }}>Historical AQI</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
          No historical database records available for {locationName || 'this location'}.
        </p>
      </div>
    );
  }

  const aqi = Math.round(latestData.aqi);
  const categoryClass = getNAQICategoryClass(aqi);
  const categoryName = getNAQICategoryName(aqi);

  // Use recordDate if available
  const dateStr = latestData.recordDate || latestData.timestamp;

  return (
    <div className="glass-card flex flex-col items-center justify-center text-center">
      <div className="flex items-center gap-2" style={{ marginBottom: '4px' }}>
        <Database size={16} style={{ color: 'var(--accent-color)' }} />
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Historical AQI</h3>
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
        Latest record from database · NAQI scale
      </p>

      <div className="text-4xl" style={{ margin: '8px 0 12px 0', fontWeight: 700 }}>
        {aqi}
      </div>

      <span className={`status-badge ${categoryClass}`}>
        {categoryName}
      </span>

      {dateStr && (
        <p style={{ marginTop: '12px', marginBottom: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Record Date: {dateStr}
        </p>
      )}
    </div>
  );
};

export default AQISummary;
