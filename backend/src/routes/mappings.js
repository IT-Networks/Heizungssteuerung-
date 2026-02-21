const express = require('express');
const database = require('../services/database');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(database.mappings.getAll());
});

router.put('/', (req, res) => {
  const {
    resourceId,
    resourceName,
    deviceId,
    deviceName,
    targetTemperature,
    idleTemperature,
    preheatMinutes,
    enabled,
  } = req.body;

  if (!resourceId || !deviceId) {
    return res.status(400).json({ error: 'resourceId and deviceId are required' });
  }

  const mapping = database.mappings.upsert({
    resourceId: Number(resourceId),
    resourceName: resourceName || '',
    deviceId: String(deviceId),
    deviceName: deviceName || '',
    targetTemperature: Number(targetTemperature) || 21,
    idleTemperature: Number(idleTemperature) || 16,
    preheatMinutes: Number(preheatMinutes) || 30,
    enabled: enabled !== false,
  });

  res.json(mapping);
});

router.delete('/:id', (req, res) => {
  database.mappings.remove(Number(req.params.id));
  res.json({ success: true });
});

module.exports = router;
