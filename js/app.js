/**
 * AirPulse Main Coordinator & Controller (Vercel Secure Version)
 * Links API Services, Map Module, Chart Module, and User Interface events.
 */

import { ApiService } from './api.js';
import { MapModule } from './map.js';
import { ChartsModule } from './charts.js';

// Global Dashboard State
const State = {
  provider: 'meteo', // 'meteo' or 'waqi'
  waqiToken: '', // Defaults to empty so Vercel server-side environment variables are used
  currentLocation: {
    name: 'London',
    lat: 51.5074,
    lng: -0.1278,
    country: 'United Kingdom'
  },
  currentData: null,
  chartMode: 'hourly', // 'hourly' or 'daily'
  theme: 'dark',
  favorites: [
    { name: 'London', lat: 51.5074, lng: -0.1278, country: 'United Kingdom' },
    { name: 'Tokyo', lat: 35.6895, lng: 139.6917, country: 'Japan' },
    { name: 'New York', lat: 40.7128, lng: -74.0060, country: 'United States' }
  ]
};

// Debounce timer for autocomplete search
let searchDebounceTimer = null;

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  loadLocalStorage();
  initTheme();
  bindEvents();
  renderFavoritesList();
  
  // Set initial coordinates
  refreshData();
  
  // Test server-side token setup in background
  testTokenConnection();

  // Render initial icons
  lucide.createIcons();
});

/**
 * Load saved states from LocalStorage
 */
function loadLocalStorage() {
  const savedTheme = localStorage.getItem('airpulse-theme');
  if (savedTheme) State.theme = savedTheme;

  const savedProvider = localStorage.getItem('airpulse-provider');
  if (savedProvider) State.provider = savedProvider;

  const savedToken = localStorage.getItem('airpulse-token-override');
  if (savedToken) State.waqiToken = savedToken;

  const savedFavs = localStorage.getItem('airpulse-favorites');
  if (savedFavs) {
    try {
      State.favorites = JSON.parse(savedFavs);
    } catch (e) {
      console.warn('Error parsing favorites, using defaults');
    }
  }

  const savedLoc = localStorage.getItem('airpulse-location');
  if (savedLoc) {
    try {
      State.currentLocation = JSON.parse(savedLoc);
    } catch (e) {
      console.warn('Error parsing location, using defaults');
    }
  }

  // Update Settings drawer form inputs
  const tokenInput = document.getElementById('waqi-token-input');
  if (tokenInput) tokenInput.value = State.waqiToken;

  updateProviderUI();
}

/**
 * Persist critical State values
 */
function saveStateToStorage() {
  localStorage.setItem('airpulse-theme', State.theme);
  localStorage.setItem('airpulse-provider', State.provider);
  localStorage.setItem('airpulse-token-override', State.waqiToken);
  localStorage.setItem('airpulse-favorites', JSON.stringify(State.favorites));
  localStorage.setItem('airpulse-location', JSON.stringify(State.currentLocation));
}

/**
 * Manage Light/Dark Theme Setup
 */
function initTheme() {
  const body = document.body;
  const themeIcon = document.getElementById('theme-icon');
  
  body.setAttribute('data-theme', State.theme);
  
  if (State.theme === 'light') {
    themeIcon.setAttribute('data-lucide', 'moon');
  } else {
    themeIcon.setAttribute('data-lucide', 'sun');
  }
}

/**
 * Switch Primary Provider Buttons in UI
 */
function updateProviderUI() {
  const btnMeteo = document.getElementById('provider-meteo');
  const btnWaqi = document.getElementById('provider-waqi');
  const tokenGroup = document.getElementById('waqi-token-group');

  if (State.provider === 'meteo') {
    btnMeteo.classList.add('active');
    btnWaqi.classList.remove('active');
    tokenGroup.style.display = 'none';
  } else {
    btnMeteo.classList.remove('active');
    btnWaqi.classList.add('active');
    tokenGroup.style.display = 'flex';
  }
}

/**
 * Async check if WAQI Token works
 */
async function testTokenConnection() {
  if (State.provider !== 'waqi') return;
  
  const dot = document.getElementById('token-status-dot');
  const text = document.getElementById('token-status-text');
  
  dot.className = 'status-dot unknown';
  text.textContent = 'Verifying connection...';
  text.style.color = 'var(--text-secondary)';

  const ok = await ApiService.testWAQIToken(State.waqiToken);

  if (ok) {
    dot.className = 'status-dot ok';
    text.textContent = State.waqiToken ? 'Custom Token Connected' : 'Server Default Token Connected';
    text.style.color = 'var(--aqi-good)';
  } else {
    dot.className = 'status-dot error';
    text.textContent = 'Connection or token failed!';
    text.style.color = 'var(--aqi-unhealthy)';
    showToast('WAQI API Proxy connection failed. Ensure server variables are configured.', 'error');
  }
}

/**
 * Main function to sync the UI elements with new fetched data
 */
async function refreshData() {
  const heroLoader = document.getElementById('hero-loader');
  const mapLoader = document.getElementById('map-loader');
  
  heroLoader.classList.add('active');
  mapLoader.classList.add('active');

  try {
    let data;
    
    if (State.provider === 'waqi') {
      try {
        data = await ApiService.fetchFromWAQI(
          State.currentLocation.lat,
          State.currentLocation.lng,
          State.waqiToken
        );
      } catch (err) {
        console.warn('WAQI proxy failed, falling back to Open-Meteo:', err.message);
        showToast('WAQI serverless proxy failed. Falling back to Open-Meteo.', 'info');
        data = await ApiService.fetchFromOpenMeteo(
          State.currentLocation.lat,
          State.currentLocation.lng
        );
      }
    } else {
      data = await ApiService.fetchFromOpenMeteo(
        State.currentLocation.lat,
        State.currentLocation.lng
      );
    }

    State.currentData = data;
    updateDashboardUI(data);
    
  } catch (error) {
    console.error('Refresh data error:', error);
    showToast('Failed to retrieve atmospheric datasets. Check connections.', 'error');
  } finally {
    heroLoader.classList.remove('active');
    mapLoader.classList.remove('active');
  }
}

/**
 * Re-populate all DOM components with data
 */
function updateDashboardUI(data) {
  document.getElementById('display-city').textContent = data.cityName || State.currentLocation.name;
  document.getElementById('display-coords').textContent = `Coords: ${data.lat.toFixed(4)}°N, ${data.lng.toFixed(4)}°E`;

  document.getElementById('display-aqi').textContent = data.aqi;
  document.getElementById('display-status').textContent = data.status;
  document.getElementById('display-description').textContent = data.description;

  const aqiColors = {
    'Good': { hex: '#10b981', glow: 'rgba(16, 185, 129, 0.25)' },
    'Moderate': { hex: '#f59e0b', glow: 'rgba(245, 158, 11, 0.25)' },
    'Unhealthy for Sensitive Groups': { hex: '#f97316', glow: 'rgba(249, 115, 22, 0.25)' },
    'Unhealthy': { hex: '#ef4444', glow: 'rgba(239, 68, 68, 0.25)' },
    'Very Unhealthy': { hex: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.25)' },
    'Hazardous': { hex: '#7f1d1d', glow: 'rgba(127, 29, 29, 0.25)' }
  };

  const aqiStyle = aqiColors[data.status] || aqiColors['Good'];
  document.documentElement.style.setProperty('--aqi-color', aqiStyle.hex);
  document.documentElement.style.setProperty('--aqi-color-glow', aqiStyle.glow);

  const progressRing = document.getElementById('aqi-progress-ring');
  const circumference = 2 * Math.PI * 70;
  const maxVal = 300;
  const offset = circumference - (Math.min(data.aqi, maxVal) / maxVal) * circumference;
  progressRing.style.strokeDashoffset = offset;

  document.getElementById('display-temp').textContent = `${data.weather.temp}°C`;
  document.getElementById('display-weather-desc').textContent = `${data.weather.desc} • Humidity: ${data.weather.humidity}%`;
  
  setWeatherIcon(data.weather.code);

  updatePollutantCard('pm25', data.pollutants.pm25, 12, 35, 55, 150, 250);
  updatePollutantCard('pm10', data.pollutants.pm10, 54, 154, 254, 354, 424);
  updatePollutantCard('o3', data.pollutants.o3, 54, 70, 85, 105, 200);
  updatePollutantCard('no2', data.pollutants.no2, 40, 80, 180, 280, 400);
  updatePollutantCard('so2', data.pollutants.so2, 20, 80, 250, 350, 500);
  updatePollutantCard('co', data.pollutants.co, 4.4, 9.4, 12.4, 15.4, 30.4);

  MapModule.initMap(
    'leaflet-map',
    data.lat,
    data.lng,
    data.aqi,
    aqiStyle.hex,
    data.cityName || State.currentLocation.name
  );

  ChartsModule.renderChart('forecastChart', data.hourly, State.chartMode);

  updateHealthAdvisory(data.aqi);
}

/**
 * Set pollutant concentrations and status fill percentages
 */
function updatePollutantCard(id, val, good, mod, sens, unh, very) {
  const displayVal = val !== undefined && val !== null ? val : '--';
  document.getElementById(`val-${id}`).textContent = displayVal;

  const fill = document.getElementById(`bar-${id}`);
  if (val === undefined || val === null || val === 0) {
    fill.style.width = '0%';
    return;
  }

  const pct = Math.min((val / very) * 100, 100);
  fill.style.width = `${pct}%`;

  let color = 'var(--aqi-good)';
  if (val > very) color = 'var(--aqi-hazardous)';
  else if (val > unh) color = 'var(--aqi-very-unhealthy)';
  else if (val > sens) color = 'var(--aqi-unhealthy)';
  else if (val > mod) color = 'var(--aqi-unhealthy-sensitive)';
  else if (val > good) color = 'var(--aqi-moderate)';

  fill.style.background = color;
}

/**
 * Assign appropriate SVG/lucide icon for weather forecasts
 */
function setWeatherIcon(code) {
  const container = document.getElementById('weather-icon-placeholder');
  let iconName = 'cloud';
  
  if (code === 0 || code === 1) iconName = 'sun';
  else if (code === 2 || code === 3) iconName = 'cloud-sun';
  else if (code >= 45 && code <= 48) iconName = 'cloud-fog';
  else if (code >= 51 && code <= 65) iconName = 'cloud-rain';
  else if (code >= 71 && code <= 77) iconName = 'cloud-snow';
  else if (code >= 80 && code <= 82) iconName = 'cloud-drizzle';
  else if (code >= 95) iconName = 'cloud-lightning';

  container.innerHTML = `<i data-lucide="${iconName}" style="width: 32px; height: 32px; color: var(--accent-cyan);"></i>`;
  lucide.createIcons();
}

/**
 * Render custom advice summaries matching actual AQI thresholds
 */
function updateHealthAdvisory(aqi) {
  const genOutdoor = document.getElementById('advice-gen-outdoor');
  const genGeneral = document.getElementById('advice-gen-general');
  const sensKids = document.getElementById('advice-sens-kids');
  const sensResp = document.getElementById('advice-sens-resp');
  const outCardio = document.getElementById('advice-out-cardio');
  const outExposure = document.getElementById('advice-out-exposure');
  const protVent = document.getElementById('advice-prot-vent');
  const protFilter = document.getElementById('advice-prot-filter');

  if (aqi <= 50) {
    genOutdoor.textContent = 'Excellent conditions for outdoor workouts, jogs, and walks.';
    genGeneral.textContent = 'No atmospheric health concerns. Breathe freely and enjoy.';
    sensKids.textContent = 'Safe for infants, toddlers, elderly groups, and children.';
    sensResp.textContent = 'Asthma and allergy sufferers can move freely without risk.';
    outCardio.textContent = 'Great day for outdoor marathons, high intensity cardio, and sports.';
    outExposure.textContent = 'Extended outdoor activities pose absolutely zero risk.';
    protVent.textContent = 'Keep your windows open to aerate rooms with high quality air.';
    protFilter.textContent = 'Mechanical air purifiers are completely unnecessary today.';
  } else if (aqi <= 100) {
    genOutdoor.textContent = 'Highly acceptable day for walking and general outdoor breaks.';
    genGeneral.textContent = 'Highly clean environment, very minor risk to hyper-sensitive individuals.';
    sensKids.textContent = 'Very safe for children, monitor elders doing heavy sports.';
    sensResp.textContent = 'Extremely sensitive individuals should monitor throat discomfort.';
    outCardio.textContent = 'Safe for standard workouts; very sensitive groups might reduce cardio.';
    outExposure.textContent = 'Excellent for standard exposure. Keep training intervals normal.';
    protVent.textContent = 'Great window ventilation; highly fresh indoor environment.';
    protFilter.textContent = 'Save active carbon filters; natural air circulation is sufficient.';
  } else if (aqi <= 150) {
    genOutdoor.textContent = 'Consider reducing heavy outdoor work or long workouts today.';
    genGeneral.textContent = 'Sensitive populations could experience mild respiratory symptoms.';
    sensKids.textContent = 'Elders and children should avoid heavy outdoor cardio activities.';
    sensResp.textContent = 'Asthmatics must keep inhalers handy; avoid active allergy triggers.';
    outCardio.textContent = 'Perform cardio workouts inside or reduce the overall intensity.';
    outExposure.textContent = 'Limit prolonged exposure outdoors if you are sensitive to dust/smoke.';
    protVent.textContent = 'Limit window aeration during peak combustion or warm hours.';
    protFilter.textContent = 'Excellent day to turn on HEPA air filters in bedroom spaces.';
  } else if (aqi <= 200) {
    genOutdoor.textContent = 'Avoid long periods outdoors. Exercise indoors or reschedule.';
    genGeneral.textContent = 'Standard populations will feel light throat dry-outs and coughs.';
    sensKids.textContent = 'Children and elders must restrict all active outdoor plays.';
    sensResp.textContent = 'Highly problematic for asthmatics. Remain indoors with filters active.';
    outCardio.textContent = 'Strictly avoid intensive outdoor cardio. Walk gently if necessary.';
    outExposure.textContent = 'Wear protective PM2.5 masks if going outdoors for over 15 minutes.';
    protVent.textContent = 'Keep windows closed to block fine particulate matter intrusions.';
    protFilter.textContent = 'Ensure indoor air purifiers are active on high speed settings.';
  } else {
    genOutdoor.textContent = 'Emergency conditions. Strictly avoid any outdoor activities.';
    genGeneral.textContent = 'Serious respiratory reactions likely for the entire population.';
    sensKids.textContent = 'Infants and elders must stay inside tightly sealed rooms.';
    sensResp.textContent = 'Severe risk of asthmatic complications. Keep clinical tools close.';
    outCardio.textContent = 'Do not run or exercise outdoors. Maintain absolute rest.';
    outExposure.textContent = 'Avoid leaving home. If mandatory, use high-filtration N95 masks.';
    protVent.textContent = 'Do not open windows. Recycle air via AC or specialized filters.';
    protFilter.textContent = 'Run air purifiers at max power in all closed living zones.';
  }
}

/**
 * Event bindings manager
 */
function bindEvents() {
  // Theme Toggle Button
  document.getElementById('btn-theme-toggle').addEventListener('click', () => {
    State.theme = State.theme === 'dark' ? 'light' : 'dark';
    initTheme();
    saveStateToStorage();
    showToast(`Switched to ${State.theme} mode`, 'success');
  });

  // Settings Drawer triggers
  const drawer = document.getElementById('settings-drawer');
  document.getElementById('btn-settings-drawer').addEventListener('click', () => {
    drawer.classList.add('open');
    MapModule.invalidateSize();
  });

  document.getElementById('btn-close-drawer').addEventListener('click', () => {
    drawer.classList.remove('open');
  });

  document.addEventListener('mousedown', (e) => {
    if (drawer.classList.contains('open') && !drawer.contains(e.target) && !document.getElementById('btn-settings-drawer').contains(e.target)) {
      drawer.classList.remove('open');
    }
  });

  // Provider configuration selections
  document.getElementById('provider-meteo').addEventListener('click', () => {
    State.provider = 'meteo';
    updateProviderUI();
    saveStateToStorage();
    refreshData();
    showToast('Provider switched to Open-Meteo (Global, Keyless)', 'success');
  });

  document.getElementById('provider-waqi').addEventListener('click', () => {
    State.provider = 'waqi';
    updateProviderUI();
    saveStateToStorage();
    refreshData();
    testTokenConnection();
    showToast('Provider switched to WAQI API Secure Proxy', 'success');
  });

  // WAQI API Token input update
  document.getElementById('waqi-token-input').addEventListener('change', (e) => {
    State.waqiToken = e.target.value;
    saveStateToStorage();
    testTokenConnection();
    refreshData();
  });

  // GPS Locator Button
  document.getElementById('btn-gps').addEventListener('click', () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      return;
    }
    
    showToast('Locating your GPS coordinates...', 'info');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        State.currentLocation = {
          name: 'My Location',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          country: ''
        };
        saveStateToStorage();
        refreshData();
        showToast('Location updated to GPS position!', 'success');
      },
      (err) => {
        showToast(`Geolocation access denied: ${err.message}`, 'error');
      }
    );
  });

  // City Search Autocomplete events
  const searchInput = document.getElementById('city-search');
  const dropdown = document.getElementById('autocomplete-dropdown');

  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounceTimer);
    const val = e.target.value;
    
    if (val.trim().length < 2) {
      dropdown.style.display = 'none';
      return;
    }

    searchDebounceTimer = setTimeout(async () => {
      const results = await ApiService.searchLocations(val);
      renderAutocompleteDropdown(results);
    }, 300);
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  // Chart view switches
  document.getElementById('btn-chart-hourly').addEventListener('click', () => {
    document.getElementById('btn-chart-hourly').classList.add('active');
    document.getElementById('btn-chart-daily').classList.remove('active');
    State.chartMode = 'hourly';
    if (State.currentData) {
      ChartsModule.renderChart('forecastChart', State.currentData.hourly, 'hourly');
    }
  });

  document.getElementById('btn-chart-daily').addEventListener('click', () => {
    document.getElementById('btn-chart-hourly').classList.remove('active');
    document.getElementById('btn-chart-daily').classList.add('active');
    State.chartMode = 'daily';
    if (State.currentData) {
      ChartsModule.renderChart('forecastChart', State.currentData.hourly, 'daily');
    }
  });

  // Health guidance advisory tabs switches
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabId = e.target.dataset.tab;
      
      tabBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(`tab-${tabId}`).classList.add('active');
    });
  });

  // Bookmark current city button click
  document.getElementById('btn-bookmark-current').addEventListener('click', () => {
    const activeCityName = State.currentData?.cityName || State.currentLocation.name;
    
    const exists = State.favorites.some(f => 
      f.name.toLowerCase() === activeCityName.toLowerCase() ||
      (Math.abs(f.lat - State.currentLocation.lat) < 0.01 && Math.abs(f.lng - State.currentLocation.lng) < 0.01)
    );

    if (exists) {
      showToast('Location is already bookmarked!', 'info');
      return;
    }

    State.favorites.push({
      name: activeCityName,
      lat: State.currentLocation.lat,
      lng: State.currentLocation.lng,
      country: State.currentLocation.country || ''
    });

    saveStateToStorage();
    renderFavoritesList();
    showToast(`${activeCityName} bookmarked!`, 'success');
  });

  // Informative Tooltips Event delegation
  document.addEventListener('click', (e) => {
    const tooltipBtn = e.target.closest('.info-tooltip-btn');
    if (!tooltipBtn) return;
    
    const infoType = tooltipBtn.dataset.info;
    const details = {
      pm25: 'PM2.5 refers to fine atmospheric particles less than 2.5 microns wide. They penetrate deep into lungs and bloodstreams, causing major cardiac and asthma risks.',
      pm10: 'PM10 refers to coarser inhalable particles less than 10 microns (dust, pollen, mold). They irritate airways, nasal corridors, and eyes.',
      o3: 'Ozone (O3) at ground level is formed by chemical reactions between combustion gases and sunlight. It triggers asthma attacks, chest congestion, and reduces lung function.',
      no2: 'Nitrogen Dioxide (NO2) is a red-brown toxic gas released primarily from vehicular engines and power plants. Highly corrosive to respiratory systems.',
      so2: 'Sulfur Dioxide (SO2) is a gas produced by coal burning and metal smelting. It irritates breathing tracts, triggers bronchoconstriction, and causes acid rain.',
      co: 'Carbon Monoxide (CO) is an odorless, colorless toxic gas emitted by incomplete combustion. It decreases oxygen delivery capacity in the circulatory system.'
    };

    if (details[infoType]) {
      showToast(details[infoType], 'info');
    }
  });
}

/**
 * Render autocompleted dropdown matches in DOM
 */
function renderAutocompleteDropdown(results) {
  const dropdown = document.getElementById('autocomplete-dropdown');
  dropdown.innerHTML = '';
  
  if (!results || results.length === 0) {
    dropdown.style.display = 'none';
    return;
  }

  results.forEach(loc => {
    const item = document.createElement('div');
    item.className = 'autocomplete-item';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'city-name';
    nameSpan.textContent = loc.name;

    const countrySpan = document.createElement('span');
    countrySpan.className = 'country-name';
    const stateStr = loc.admin1 ? `${loc.admin1}, ` : '';
    countrySpan.textContent = `${stateStr}${loc.country || ''}`;

    item.appendChild(nameSpan);
    item.appendChild(countrySpan);

    item.addEventListener('click', () => {
      State.currentLocation = {
        name: loc.name,
        lat: loc.latitude,
        lng: loc.longitude,
        country: loc.country || ''
      };
      
      document.getElementById('city-search').value = '';
      dropdown.style.display = 'none';
      
      saveStateToStorage();
      refreshData();
      showToast(`Loading data for ${loc.name}...`, 'success');
    });

    dropdown.appendChild(item);
  });

  dropdown.style.display = 'block';
}

/**
 * Render favorite bookmarks drawer sidebar list
 */
function renderFavoritesList() {
  const container = document.getElementById('favorites-list-container');
  container.innerHTML = '';

  if (!State.favorites || State.favorites.length === 0) {
    container.innerHTML = '<div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 12px 0;">No bookmarked locations.</div>';
    return;
  }

  State.favorites.forEach((fav, index) => {
    const item = document.createElement('div');
    item.className = 'favorite-item';

    const textWrapper = document.createElement('div');
    textWrapper.className = 'favorite-name';
    textWrapper.innerHTML = `<i data-lucide="building" style="width: 14px; height: 14px; color: var(--accent-cyan);"></i> <span>${fav.name}</span>`;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove-fav';
    removeBtn.innerHTML = '&times;';
    removeBtn.title = 'Remove bookmark';
    
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      State.favorites.splice(index, 1);
      saveStateToStorage();
      renderFavoritesList();
      showToast(`${fav.name} removed from bookmarks`, 'info');
    });

    item.appendChild(textWrapper);
    item.appendChild(removeBtn);

    item.addEventListener('click', () => {
      State.currentLocation = fav;
      saveStateToStorage();
      refreshData();
      document.getElementById('settings-drawer').classList.remove('open');
      showToast(`Selected bookmarked city: ${fav.name}`, 'success');
    });

    container.appendChild(item);
  });

  lucide.createIcons();
}

/**
 * Toast Notification Utility
 * Injects beautiful glass cards into viewport fading out automatically
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  else if (type === 'error') iconName = 'alert-triangle';

  toast.innerHTML = `<i data-lucide="${iconName}" style="width: 16px; height: 16px; flex-shrink: 0;"></i> <span>${message}</span>`;
  container.appendChild(toast);
  
  lucide.createIcons();

  setTimeout(() => {
    toast.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(15px)';
    
    setTimeout(() => {
      if (toast.parentNode === container) {
        container.removeChild(toast);
      }
    }, 500);
  }, 4000);
}
