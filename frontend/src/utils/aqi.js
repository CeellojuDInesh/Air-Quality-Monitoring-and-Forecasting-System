/**
 * US EPA AQI Category Mapping
 * Scale:
 *   0–50: Good
 *   51–100: Moderate
 *   101–150: Unhealthy for Sensitive Groups
 *   151–200: Unhealthy
 *   201–300: Very Unhealthy
 *   301–500+: Hazardous
 */
export const getUSAQICategoryName = (aqi) => {
  if (aqi === null || aqi === undefined || isNaN(aqi)) return '—';
  const val = Math.round(Number(aqi));
  if (val <= 50) return 'Good';
  if (val <= 100) return 'Moderate';
  if (val <= 150) return 'Unhealthy for Sensitive Groups';
  if (val <= 200) return 'Unhealthy';
  if (val <= 300) return 'Very Unhealthy';
  return 'Hazardous';
};

export const getUSAQICategoryClass = (aqi) => {
  if (aqi === null || aqi === undefined || isNaN(aqi)) return '';
  const val = Math.round(Number(aqi));
  if (val <= 50) return 'status-us-good';
  if (val <= 100) return 'status-us-moderate';
  if (val <= 150) return 'status-us-sensitive';
  if (val <= 200) return 'status-us-unhealthy';
  if (val <= 300) return 'status-us-very-unhealthy';
  return 'status-us-hazardous';
};

/**
 * Indian National AQI (NAQI) Category Mapping (for historical database records & LSTM)
 * Scale:
 *   0–50: Good
 *   51–100: Satisfactory
 *   101–200: Moderate
 *   201–300: Poor
 *   301–400: Very Poor
 *   401+: Severe
 */
export const getNAQICategoryName = (aqi) => {
  if (aqi === null || aqi === undefined || isNaN(aqi)) return '—';
  const val = Math.round(Number(aqi));
  if (val <= 50) return 'Good';
  if (val <= 100) return 'Satisfactory';
  if (val <= 200) return 'Moderate';
  if (val <= 300) return 'Poor';
  if (val <= 400) return 'Very Poor';
  return 'Severe';
};

export const getNAQICategoryClass = (aqi) => {
  if (aqi === null || aqi === undefined || isNaN(aqi)) return '';
  const val = Math.round(Number(aqi));
  if (val <= 50) return 'status-good';
  if (val <= 100) return 'status-satisfactory';
  if (val <= 200) return 'status-moderate';
  if (val <= 300) return 'status-poor';
  if (val <= 400) return 'status-very-poor';
  return 'status-severe';
};

/**
 * Default AQI Category helpers.
 * Defaults to US EPA AQI mapping as required by the dashboard.
 */
export const getAQICategoryName = (aqi, scale = 'US') => {
  return scale === 'NAQI' ? getNAQICategoryName(aqi) : getUSAQICategoryName(aqi);
};

export const getAQICategoryClass = (aqi, scale = 'US') => {
  return scale === 'NAQI' ? getNAQICategoryClass(aqi) : getUSAQICategoryClass(aqi);
};
