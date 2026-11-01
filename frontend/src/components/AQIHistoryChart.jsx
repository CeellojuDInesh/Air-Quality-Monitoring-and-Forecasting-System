import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const AQIHistoryChart = ({ data, locationName }) => {
  if (!data || data.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center justify-center text-center" style={{ minHeight: '350px' }}>
        <h2 className="mb-2" style={{ fontSize: '1.2rem' }}>Historical AQI Trend</h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          No historical records available in database for {locationName || 'this location'}.
        </p>
      </div>
    );
  }

  // Format data for chart (data is in descending order from API, reverse to chronological)
  const chartData = [...data].reverse().map(item => {
    const rawDate = item.recordDate || item.timestamp;
    let label = rawDate;
    try {
      const d = new Date(rawDate + (rawDate.length === 10 ? 'T00:00:00' : ''));
      label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      label = rawDate;
    }
    return {
      time: label,
      aqi: item.aqi != null ? Math.round(item.aqi) : null,
    };
  });

  return (
    <div className="glass-card" style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Historical AQI Trend (Last 30 Days)</h2>
        {locationName && (
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Station: {locationName}
          </span>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
            <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={12} tickLine={false} />
            <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid var(--surface-border)', borderRadius: '8px' }}
              itemStyle={{ color: 'var(--text-primary)' }}
            />
            <Line
              type="monotone"
              dataKey="aqi"
              name="AQI"
              stroke="var(--accent-color)"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AQIHistoryChart;
