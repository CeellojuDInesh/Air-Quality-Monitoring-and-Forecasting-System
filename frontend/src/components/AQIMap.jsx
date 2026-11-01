import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default leaflet icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
};

const AQIMap = ({ activeCoords, location, latestData, liveData }) => {
  // Use active coordinates (from GPS or search) first; fallback to DB location
  const lat = activeCoords?.lat ?? location?.latitude;
  const lon = activeCoords?.lon ?? location?.longitude;
  const displayName = activeCoords?.name || location?.cityName || 'Selected Location';

  // Current AQI: live US AQI if available, else historical station AQI
  let aqiDisplay = 'N/A';
  if (liveData?.usAqi != null) {
    aqiDisplay = `${liveData.usAqi} (US AQI)`;
  } else if (latestData?.aqi != null) {
    aqiDisplay = `${Math.round(latestData.aqi)} (NAQI)`;
  }

  if (!lat || !lon) {
    return (
      <div className="glass-card flex items-center justify-center" style={{ height: '350px' }}>
        Loading map coordinates…
      </div>
    );
  }

  const position = [lat, lon];

  return (
    <div className="glass-card" style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ margin: 0 }}>Location Map</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {displayName}
        </span>
      </div>
      <div style={{ flex: 1, borderRadius: '8px', overflow: 'hidden' }}>
        <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapUpdater center={position} />
          <Marker position={position}>
            <Popup>
              <strong>{displayName}</strong><br />
              Coordinates: {lat.toFixed(4)}, {lon.toFixed(4)}<br />
              Current AQI: {aqiDisplay}
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
};

export default AQIMap;
