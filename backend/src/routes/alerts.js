const express = require('express');
const database = require('../services/database');

const router = express.Router();

// GET /api/alerts - list alerts
router.get('/', (req, res) => {
  const active = req.query.active === 'true';
  const limit = parseInt(req.query.limit || '50', 10);
  const alerts = active ? database.alerts.getActive(limit) : database.alerts.getAll(limit);
  res.json(alerts);
});

// POST /api/alerts/:id/acknowledge
router.post('/:id/acknowledge', (req, res) => {
  database.alerts.acknowledge(Number(req.params.id));
  res.json({ success: true });
});

// POST /api/alerts/acknowledge-all
router.post('/acknowledge-all', (req, res) => {
  database.alerts.acknowledgeAll();
  res.json({ success: true });
});

module.exports = router;
