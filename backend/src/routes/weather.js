const express = require('express');
const axios = require('axios');
const weather = require('../services/weather');
const database = require('../services/database');

const router = express.Router();

// GET /api/weather - get current outdoor temperature
router.get('/', async (req, res) => {
  try {
    const settings = database.settings.getAll();
    const data = await weather.getCurrentTemperature();

    res.json({
      enabled: settings.weather_enabled === 'true',
      threshold: parseFloat(settings.weather_threshold) || 15,
      latitude: settings.weather_latitude || null,
      longitude: settings.weather_longitude || null,
      current: data,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/weather/search?q=city - search for location
router.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query || query.length < 2) {
    return res.json([]);
  }

  try {
    const response = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
      params: {
        name: query,
        count: 5,
        language: 'de',
        format: 'json',
      },
      timeout: 5000,
    });

    const results = (response.data.results || []).map(r => ({
      name: r.name,
      country: r.country,
      admin1: r.admin1, // State/Region
      latitude: r.latitude,
      longitude: r.longitude,
    }));

    res.json(results);
  } catch (error) {
    console.error('[Weather] Location search failed:', error.message);
    res.json([]);
  }
});

module.exports = router;
