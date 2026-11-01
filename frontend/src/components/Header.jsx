import React, { useState, useRef, useEffect } from 'react';
import { Wind, MapPin, Search, Loader } from 'lucide-react';
import { searchLocations, reverseGeocode } from '../services/api';

const Header = ({ locations = [], selectedLocation, onLocationChange, onCoordsChange, displayName }) => {
  const [query, setQuery]             = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching]     = useState(false);
  const [gpsLoading, setGpsLoading]   = useState(false);
  const [gpsError, setGpsError]       = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef  = useRef(null);

  const locList = Array.isArray(locations) ? locations : [];

  // Close suggestion list when clicking outside the search wrapper
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setGpsError(null);
    clearTimeout(debounceRef.current);

    if (!val.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchLocations(val.trim());
        setSuggestions(results || []);
        setShowDropdown(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handleSelectSuggestion = (result) => {
    const label =
      result.name +
      (result.admin1 ? `, ${result.admin1}` : '') +
      (result.country ? `, ${result.country}` : '');
    setQuery(label);
    setSuggestions([]);
    setShowDropdown(false);
    onCoordsChange({ lat: result.latitude, lon: result.longitude, name: label });
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setQuery('');
        setSuggestions([]);

        let areaName = `Location (${lat.toFixed(3)}, ${lon.toFixed(3)})`;
        try {
          const rev = await reverseGeocode(lat, lon);
          if (rev?.name) {
            areaName = rev.name;
          }
        } catch (err) {
          console.warn('Reverse geocode failed, using coordinates fallback:', err);
        } finally {
          setGpsLoading(false);
          onCoordsChange({
            lat,
            lon,
            name: areaName,
          });
        }
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1)      setGpsError('Location permission denied. Please allow access in your browser.');
        else if (err.code === 2) setGpsError('Location unavailable. Check GPS or network.');
        else                      setGpsError('Could not determine location. Please try again.');
      },
      { timeout: 10000 }
    );
  };

  return (
    <header className="glass-card mb-4">
      <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '16px' }}>

        {/* ── Brand ────────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <Wind size={32} style={{ color: 'var(--accent-color)' }} />
          <div>
            <h1 className="text-2xl" style={{ margin: 0 }}>Air Quality Dashboard</h1>
            <p style={{ margin: 0 }}>
              {displayName
                ? <span style={{ color: 'var(--accent-color)' }}>{displayName}</span>
                : 'Real-time monitoring & prediction'}
            </p>
          </div>
        </div>

        {/* ── Controls ──────────────────────────────────────────── */}
        <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>

          {/* DB location selector (shows saved locations like Hyderabad) */}
          {locList.length > 0 && (
            <select
              className="select-dropdown"
              value={selectedLocation?.id || ''}
              onChange={(e) => {
                const loc = locList.find(l => l.id === parseInt(e.target.value));
                if (loc) {
                  onLocationChange(loc);
                  setQuery('');
                  setSuggestions([]);
                }
              }}
            >
              {!selectedLocation?.id && (
                <option value="" disabled>-- Monitored Station --</option>
              )}
              {locList.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.cityName}</option>
              ))}
            </select>
          )}

          {/* Open-Meteo location search */}
          <div ref={wrapperRef} style={{ position: 'relative' }}>
            <div className="search-input-wrapper">
              {searching
                ? <Loader size={16} className="search-icon spinning" />
                : <Search size={16} className="search-icon" />}
              <input
                type="text"
                className="search-input"
                placeholder="Search any city…"
                value={query}
                onChange={handleQueryChange}
                onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
              />
            </div>

            {showDropdown && suggestions.length > 0 && (
              <ul className="search-suggestions">
                {suggestions.map((r) => (
                  <li key={r.id} onMouseDown={() => handleSelectSuggestion(r)}>
                    <MapPin size={13} style={{ flexShrink: 0, color: 'var(--accent-color)' }} />
                    <span>
                      {r.name}
                      {r.admin1 && <span style={{ color: 'var(--text-secondary)' }}>, {r.admin1}</span>}
                      {r.country && <span style={{ color: 'var(--text-secondary)' }}>, {r.country}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* GPS button */}
          <button
            className="btn-gps"
            onClick={handleUseMyLocation}
            disabled={gpsLoading}
            title="Use my current GPS location"
          >
            {gpsLoading ? <Loader size={16} className="spinning" /> : <MapPin size={16} />}
            {gpsLoading ? 'Locating…' : 'Use My Location'}
          </button>
        </div>
      </div>

      {/* GPS error message */}
      {gpsError && (
        <p style={{ margin: '8px 0 0 0', color: 'var(--naqi-poor)', fontSize: '0.875rem' }}>
          ⚠ {gpsError}
        </p>
      )}
    </header>
  );
};

export default Header;
