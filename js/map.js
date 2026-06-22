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
    initMap(elementId, lat, lng, aqi, aqiColor, cityName, theme = 'light') {
        const coords = [lat, lng];

        // Initialize map only once
        if (!mapInstance) {
            mapInstance = L.map(elementId, {
                center: coords,
                zoom: 11,
                zoomControl: true,
                attributionControl: true
            });
        }

        // Remove existing tile layer
        if (tileLayerInstance) {
            mapInstance.removeLayer(tileLayerInstance);
        }

        // Theme-aware basemap
        const tileConfig = theme === 'light'
            ? {
                url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                attribution:
                    '&copy; OpenStreetMap contributors &copy; CARTO'
            }
            : {
                url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                attribution:
                    '&copy; OpenStreetMap contributors &copy; CARTO'
            };

        tileLayerInstance = L.tileLayer(tileConfig.url, {
            attribution: tileConfig.attribution,
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(mapInstance);

        // Update map view
        mapInstance.setView(coords, 11, {
            animate: true,
            duration: 1
        });

        // Remove previous markers
        if (markerInstance) {
            mapInstance.removeLayer(markerInstance);
        }

        if (circleInstance) {
            mapInstance.removeLayer(circleInstance);
        }

        // AQI Glow Ring
        circleInstance = L.circleMarker(coords, {
            radius: 18,
            fillColor: aqiColor,
            fillOpacity: 0.25,
            color: aqiColor,
            weight: 2,
            className: 'leaflet-pulsing-marker'
        }).addTo(mapInstance);

        // AQI Center Marker
        markerInstance = L.circleMarker(coords, {
            radius: 7,
            fillColor: '#ffffff',
            fillOpacity: 1,
            color: aqiColor,
            weight: 3
        }).addTo(mapInstance);

        // Theme-aware popup styling
        const popupBg = theme === 'light' ? '#ffffff' : '#1f2937';
        const textColor = theme === 'light' ? '#111827' : '#ffffff';
        const secondaryText = theme === 'light' ? '#6b7280' : '#d1d5db';

        const popupContent = `
            <div style="
                font-family:'Plus Jakarta Sans',sans-serif;
                min-width:160px;
                background:${popupBg};
                color:${textColor};
                padding:4px;
            ">
                <h4 style="
                    font-weight:700;
                    margin:0 0 6px 0;
                    font-size:14px;
                    color:${textColor};
                ">
                    ${cityName}
                </h4>

                <div style="
                    display:flex;
                    align-items:center;
                    gap:8px;
                    margin-top:8px;
                ">
                    <span style="
                        background:${aqiColor};
                        color:#ffffff;
                        font-size:12px;
                        font-weight:800;
                        padding:4px 10px;
                        border-radius:12px;
                    ">
                        AQI ${aqi}
                    </span>

                    <span style="
                        font-size:11px;
                        color:${secondaryText};
                        font-weight:500;
                    ">
                        Active Station
                    </span>
                </div>
            </div>
        `;

        markerInstance
            .bindPopup(popupContent, {
                closeButton: false,
                autoClose: false
            })
            .openPopup();

        // Fix rendering issues when map is inside tabs/cards
        setTimeout(() => {
            mapInstance.invalidateSize();
        }, 500);
    },

    /**
     * Refresh map dimensions
     */
    invalidateSize() {
        if (mapInstance) {
            mapInstance.invalidateSize();
        }
    },

    /**
     * Optional: Get map instance for future features
     */
    getMap() {
        return mapInstance;
    }
};
