const express = require('express');
const danfoss = require('../services/danfoss');

const router = express.Router();

// GET /api/devices - list all Danfoss devices
router.get('/', async (req, res) => {
  try {
    const devices = await danfoss.getDevices();
    res.json(devices);
  } catch (error) {
    console.error('[API] GET /devices error:', error.message);
    res.status(502).json({ error: 'Failed to fetch devices from Danfoss' });
  }
});

// GET /api/devices/:id - get single device details
router.get('/:id', async (req, res) => {
  try {
    const device = await danfoss.getDevice(req.params.id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.json(device);
  } catch (error) {
    console.error(`[API] GET /devices/${req.params.id} error:`, error.message);
    res.status(502).json({ error: 'Failed to fetch device from Danfoss' });
  }
});

// POST /api/devices/:id/temperature - set temperature
router.post('/:id/temperature', async (req, res) => {
  try {
    const { temperature } = req.body;
    if (typeof temperature !== 'number' || temperature < 4 || temperature > 35) {
      return res.status(400).json({ error: 'Temperature must be between 4 and 35 °C' });
    }
    const result = await danfoss.setTemperature(req.params.id, temperature);
    res.json({ success: true, result });
  } catch (error) {
    console.error(`[API] POST /devices/${req.params.id}/temperature error:`, error.message);
    res.status(502).json({ error: 'Failed to set temperature' });
  }
});

module.exports = router;
