const express = require('express');
const store = require('../services/store');

const router = express.Router();

// GET /api/mappings - list all resource-to-device mappings
router.get('/', (req, res) => {
  res.json(store.getAll());
});

// PUT /api/mappings - create or update a mapping
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

  const mapping = store.upsert({
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

// DELETE /api/mappings/:resourceId
router.delete('/:resourceId', (req, res) => {
  store.remove(Number(req.params.resourceId));
  res.json({ success: true });
});

module.exports = router;
