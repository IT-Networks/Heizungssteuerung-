const axios = require('axios');
const database = require('./database');

class WeatherService {
  constructor() {
    this.cache = null;
    this.cacheExpiry = null;
    this.CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get current outdoor temperature from Open-Meteo API
   * @returns {Promise<{temperature: number, time: string} | null>}
   */
  async getCurrentTemperature() {
    const settings = database.settings.getAll();
    const enabled = settings.weather_enabled === 'true';
    const lat = parseFloat(settings.weather_latitude);
    const lon = parseFloat(settings.weather_longitude);

    if (!enabled || isNaN(lat) || isNaN(lon)) {
      return null;
    }

    // Check cache
    if (this.cache && this.cacheExpiry && Date.now() < this.cacheExpiry) {
      return this.cache;
    }

    try {
      const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
        params: {
          latitude: lat,
          longitude: lon,
          current: 'temperature_2m',
          timezone: 'Europe/Berlin',
        },
        timeout: 10000,
      });

      const data = response.data;
      if (data.current && typeof data.current.temperature_2m === 'number') {
        this.cache = {
          temperature: data.current.temperature_2m,
          time: data.current.time,
        };
        this.cacheExpiry = Date.now() + this.CACHE_DURATION_MS;
        console.log(`[Weather] Current outdoor temperature: ${this.cache.temperature}°C`);
        return this.cache;
      }

      return null;
    } catch (error) {
      console.error('[Weather] Failed to fetch temperature:', error.message);
      return null;
    }
  }

  /**
   * Check if heating should be skipped based on outdoor temperature
   * @returns {Promise<{skip: boolean, reason: string | null, outdoorTemp: number | null}>}
   */
  async shouldSkipHeating() {
    const settings = database.settings.getAll();
    const enabled = settings.weather_enabled === 'true';
    const threshold = parseFloat(settings.weather_threshold);

    if (!enabled || isNaN(threshold)) {
      return { skip: false, reason: null, outdoorTemp: null };
    }

    const weather = await this.getCurrentTemperature();
    if (!weather) {
      return { skip: false, reason: null, outdoorTemp: null };
    }

    if (weather.temperature >= threshold) {
      return {
        skip: true,
        reason: `Außentemperatur ${weather.temperature}°C >= Schwelle ${threshold}°C`,
        outdoorTemp: weather.temperature,
      };
    }

    return {
      skip: false,
      reason: null,
      outdoorTemp: weather.temperature,
    };
  }

  /**
   * Clear cached temperature data
   */
  clearCache() {
    this.cache = null;
    this.cacheExpiry = null;
  }
}

module.exports = new WeatherService();
