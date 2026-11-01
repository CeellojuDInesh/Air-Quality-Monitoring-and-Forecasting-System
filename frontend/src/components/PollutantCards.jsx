import React from 'react';

const PollutantCards = ({ latestData, locationName }) => {
  if (!latestData) {
    return (
      <div className="glass-card flex flex-col justify-center items-center text-center" style={{ minHeight: '220px' }}>
        <h2 className="mb-2" style={{ fontSize: '1.2rem' }}>Historical Pollutant Levels</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
          No station pollutant records available in database for {locationName || 'this location'}.
        </p>
      </div>
    );
  }

  const pollutants = [
    { label: 'PM2.5', value: latestData.pm25, unit: 'µg/m³' },
    { label: 'PM10',  value: latestData.pm10, unit: 'µg/m³' },
    { label: 'NO2',   value: latestData.no2,  unit: 'µg/m³' },
    { label: 'SO2',   value: latestData.so2,  unit: 'µg/m³' },
    { label: 'CO',    value: latestData.co,   unit: 'mg/m³' },
    { label: 'O3',    value: latestData.o3,   unit: 'µg/m³' },
  ];

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Historical Pollutant Levels</h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Record: {latestData.recordDate || latestData.timestamp || 'Latest'}
        </span>
      </div>
      <div className="grid grid-cols-3" style={{ gap: '16px' }}>
        {pollutants.map((p) => (
          <div
            key={p.label}
            className="p-0"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '12px',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>
              {p.label}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>
              {p.value !== null && p.value !== undefined ? Number(p.value).toFixed(1) : '--'}
              <span style={{ fontSize: '0.75rem', marginLeft: '4px', color: 'var(--text-secondary)' }}>
                {p.unit}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PollutantCards;
