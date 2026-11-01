import React from 'react';

const AreaComparison = ({ selectedLocation, allLocations }) => {
  if (!selectedLocation || !allLocations) return null;

  const otherLocations = allLocations.filter(l => l.id !== selectedLocation.id).slice(0, 3);

  if (otherLocations.length === 0) return null;

  return (
    <div className="glass-card">
      <h2 className="mb-4">Area Comparison</h2>
      <p style={{ fontSize: '0.875rem', marginBottom: '16px' }}>Comparing {selectedLocation.cityName} with nearby stations.</p>

      <div className="grid gap-4">
        {otherLocations.map(loc => (
          <div key={loc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
            <span>{loc.cityName}</span>
            <span style={{ color: 'var(--text-secondary)' }}>Select to view data</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AreaComparison;
