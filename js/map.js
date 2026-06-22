/**
 * AirPulse Map Module
 * Controls Leaflet.js interactive maps and plots AQI markers.
 */

let mapInstance = null;
let tileLayerInstance = null; // Add this line
let markerInstance = null;
let circleInstance = null;

export const MapModule = {
  /**
   * Initialize or update Leaflet map view
   * @param {string} elementId - Container ID
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} aqi - Air Quality Index
   * @param {string} aqiColor - Hex color corresponding to AQI
   * @param {string} cityName - Name of location
   */
 // 1. Pass 'theme' into your initMap function arguments
initMap(elementId, lat, lng, aqi, aqiColor, cityName, theme = 'dark') {
    const coords = [lat, lng];

    if (!mapInstance) {
        mapInstance = L.map(elementId, {
            center: coords,
            zoom: 11,
            zoomControl: true,
            attributionControl: false
        });

        setTimeout(() => {
            mapInstance.invalidateSize();
        }, 500);
    } else {
        mapInstance.setView(coords, 11);
    }

    // 2. Clear out the previous tile layer if it exists
    if (tileLayerInstance) {
        mapInstance.removeLayer(tileLayerInstance);
    }

    // 3. Dynamically choose the URL based on your theme choice
    const tileUrl = theme === 'light' 
        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png' // Light mode URL
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';          // Dark mode URL

    tileLayerInstance = L.tileLayer(tileUrl, { maxZoom: 20 }).addTo(mapInstance);

    // ... rest of your code handling markers remains the same
      
      // Handle resizing issues (especially when loading in a hidden element or drawer)
      setTimeout(() => {
        mapInstance.invalidateSize();
      }, 500);
    } else {
      // If map exists, pan & zoom smoothly to new coordinates
      mapInstance.setView(coords, 11);
    }

    // Clear previous markers
    if (markerInstance) mapInstance.removeLayer(markerInstance);
    if (circleInstance) mapInstance.removeLayer(circleInstance);

    // Create a beautiful pulsing glow circle marker for the station
    circleInstance = L.circleMarker(coords, {
      radius: 18,
      fillColor: aqiColor,
      fillOpacity: 0.25,
      color: aqiColor,
      weight: 2,
      className: 'leaflet-pulsing-marker'
    }).addTo(mapInstance);

    // Add a central solid station pin
    markerInstance = L.circleMarker(coords, {
      radius: 7,
      fillColor: '#ffffff',
      fillOpacity: 1,
      color: aqiColor,
      weight: 3
    }).addTo(mapInstance);

    // Bind styled informative popup
    const popupContent = `
      <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 140px;">
        <h4 style="font-weight:700; margin-bottom:4px; font-size:14px; color:#fff;">${cityName}</h4>
        <div style="display:flex; align-items:center; gap:8px; margin-top:8px;">
          <span style="background:${aqiColor}; color:#fff; font-size:12px; font-weight:800; padding:3px 8px; border-radius:10px;">
            AQI ${aqi}
          </span>
          <span style="font-size:11px; color:#9ca3af; font-weight:500;">
            Active Station
          </span>
        </div>
      </div>
    `;

    markerInstance.bindPopup(popupContent, { closeButton: false }).openPopup();
  },

  /**
   * Refreshes the map dimensions (crucial for layout adjustments)
   */
  invalidateSize() {
    if (mapInstance) {
      mapInstance.invalidateSize();
    }
  }
};
