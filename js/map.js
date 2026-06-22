/**
 * AirPulse Map Module
 * Controls Leaflet.js interactive maps and plots AQI markers.
 */

let mapInstance = null;
let tileLayerInstance = null; 
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
     * @param {string} theme - 'light' or 'dark'
     */
    initMap(elementId, lat, lng, aqi, aqiColor, cityName, theme = 'dark') {
        const coords = [lat, lng];

        // 1. Initialize map container if it doesn't exist
        if (!mapInstance) {
            mapInstance = L.map(elementId, {
                center: coords,
                zoom: 11,
                zoomControl: true,
                attributionControl: false
            });
        }

        // 2. Clear out the previous tile layer before adding the new one
        if (tileLayerInstance) {
            mapInstance.removeLayer(tileLayerInstance);
        }

        // 3. Dynamically choose the URL based on the active theme
        const tileUrl = theme === 'light' 
            ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

        tileLayerInstance = L.tileLayer(tileUrl, { 
            maxZoom: 20 
        }).addTo(mapInstance);

        // 4. Smoothly pan & zoom to the coordinates
        mapInstance.setView(coords, 11);

        // 5. Clear previous markers to avoid duplicates
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

        // Bind styled informative popup dynamically adapting to light/dark text colors
        const textColor = theme === 'light' ? '#111827' : '#ffffff';
        const popupContent = `
            <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 140px;">
                <h4 style="font-weight:700; margin-bottom:4px; font-size:14px; color:${textColor};">${cityName}</h4>
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

        // Handle resizing issues (especially when loading in a hidden element or drawer)
        setTimeout(() => {
            mapInstance.invalidateSize();
        }, 500);
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
