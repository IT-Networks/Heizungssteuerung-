const express = require('express');
const danfoss = require('../services/danfoss');
const database = require('../services/database');

const router = express.Router();

// GET /api/battery - battery status for all mapped devices
router.get('/', async (req, res) => {
  try {
    const devices = await danfoss.getDevicesWithStatus();
    const storedLevels = database.battery.getAll();
    const mappings = database.mappings.getAll();

    const result = devices.map(device => {
      const deviceId = device.id || device.device_id;
      const stored = storedLevels.find(s => s.device_id === deviceId);
      const mapping = mappings.find(m => m.deviceId === deviceId);

      return {
        deviceId,
        deviceName: device.name || device.device_name || deviceId,
        batteryLevel: device.parsed.batteryLevel,
        lastRecorded: stored?.recorded_at || null,
        online: device.parsed.online,
        currentTemperature: device.parsed.currentTemperature,
        setTemperature: device.parsed.setTemperature,
        mappedResource: mapping?.resourceName || null,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('[API] GET /battery error:', error.message);
    res.status(502).json({ error: 'Batteriestatus konnte nicht abgerufen werden' });
  }
});

// GET /api/battery/:deviceId/history - battery history for a device
router.get('/:deviceId/history', (req, res) => {
  const days = parseInt(req.query.days || '30', 10);
  const history = database.battery.getHistory(req.params.deviceId, days);
  res.json(history);
});

module.exports = router;
