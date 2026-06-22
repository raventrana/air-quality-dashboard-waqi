/**
 * AirPulse Chart Module
 * Controls Chart.js interactive graph renderings and forecast updates.
 */

let chartInstance = null;

export const ChartsModule = {
  /**
   * Render or update the Chart.js visualization
   * @param {string} canvasId - Canvas DOM element ID
   * @param {Object} hourlyData - Hourly data object containing arrays (time, us_aqi, pm25, etc.)
   * @param {string} mode - Active view mode ('hourly' or 'daily')
   */
  renderChart(canvasId, hourlyData, mode = 'hourly') {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    // Destroy previous chart to avoid overlay issues on canvas re-draw
    if (chartInstance) {
      chartInstance.destroy();
    }

    let labels = [];
    let datasets = [];

    if (mode === 'hourly') {
      // Show next 24 hours of data
      const limit = Math.min(24, hourlyData.time.length);
      labels = hourlyData.time.slice(0, limit).map(t => {
        const date = new Date(t);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      });

      const aqiSet = hourlyData.us_aqi.slice(0, limit);
      const pm25Set = hourlyData.pm2_5.slice(0, limit);
      const pm10Set = hourlyData.pm10.slice(0, limit);

      datasets = [
        this.createDataset('US AQI', aqiSet, '#06b6d4', 'rgba(6, 182, 212, 0.05)'),
        this.createDataset('PM2.5 (µg/m³)', pm25Set, '#3b82f6', 'rgba(59, 130, 246, 0.03)'),
        this.createDataset('PM10 (µg/m³)', pm10Set, '#8b5cf6', 'rgba(139, 92, 246, 0.03)')
      ];
    } else {
      // Group the hourly forecast values into 7 days
      const daysMap = {};
      
      hourlyData.time.forEach((t, index) => {
        const d = new Date(t);
        const dayStr = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        
        if (!daysMap[dayStr]) {
          daysMap[dayStr] = { aqi: [], pm25: [], pm10: [] };
        }
        
        daysMap[dayStr].aqi.push(hourlyData.us_aqi[index] || 0);
        daysMap[dayStr].pm25.push(hourlyData.pm2_5[index] || 0);
        daysMap[dayStr].pm10.push(hourlyData.pm10[index] || 0);
      });

      // Format datasets as daily averages
      const dailyKeys = Object.keys(daysMap).slice(0, 7);
      labels = dailyKeys;

      const dailyAqi = dailyKeys.map(k => Math.round(this.average(daysMap[k].aqi)));
      const dailyPm25 = dailyKeys.map(k => Math.round(this.average(daysMap[k].pm25)));
      const dailyPm10 = dailyKeys.map(k => Math.round(this.average(daysMap[k].pm10)));

      datasets = [
        this.createDataset('Avg US AQI', dailyAqi, '#06b6d4', 'rgba(6, 182, 212, 0.05)'),
        this.createDataset('Avg PM2.5', dailyPm25, '#3b82f6', 'rgba(59, 130, 246, 0.03)'),
        this.createDataset('Avg PM10', dailyPm10, '#8b5cf6', 'rgba(139, 92, 246, 0.03)')
      ];
    }

    // Chart.js Configuration
    const config = {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 12,
              boxHeight: 6,
              font: {
                family: 'Plus Jakarta Sans',
                size: 11,
                weight: '500'
              },
              color: 'var(--text-secondary)'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(13, 20, 38, 0.95)',
            titleColor: '#fff',
            titleFont: { family: 'Plus Jakarta Sans', weight: '700' },
            bodyFont: { family: 'Plus Jakarta Sans' },
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 10,
            displayColors: true,
            boxWidth: 8,
            boxHeight: 8,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.03)'
            },
            ticks: {
              color: 'var(--text-muted)',
              font: {
                family: 'Plus Jakarta Sans',
                size: 10
              }
            }
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.03)'
            },
            ticks: {
              color: 'var(--text-muted)',
              font: {
                family: 'Plus Jakarta Sans',
                size: 10
              }
            },
            suggestedMin: 0
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    };

    chartInstance = new Chart(ctx, config);
  },

  /**
   * Helper to construct formatted Chart.js datasets
   */
  createDataset(label, data, color, fillColor) {
    return {
      label: label,
      data: data,
      borderColor: color,
      backgroundColor: fillColor,
      fill: true,
      tension: 0.4,
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 5,
      pointBackgroundColor: color,
      pointBorderColor: '#ffffff',
      pointBorderWidth: 1
    };
  },

  /**
   * Math helper to compute arrays average
   */
  average(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }
};
