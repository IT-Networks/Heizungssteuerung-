const express = require('express');
const scheduler = require('../services/scheduler');

const router = express.Router();

// GET /api/scheduler/status - get scheduler status
router.get('/status', (req, res) => {
  res.json(scheduler.getStatus());
});

// POST /api/scheduler/run - trigger manual run
router.post('/run', async (req, res) => {
  try {
    await scheduler.run();
    res.json(scheduler.getStatus());
  } catch (error) {
    console.error('[API] POST /scheduler/run error:', error.message);
    res.status(500).json({ error: 'Scheduler run failed' });
  }
});

module.exports = router;
