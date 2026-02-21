const express = require('express');
const database = require('../services/database');

const router = express.Router();

// GET /api/settings
router.get('/', (req, res) => {
  res.json(database.settings.getAll());
});

// PUT /api/settings
router.put('/', (req, res) => {
  const entries = req.body;
  if (!entries || typeof entries !== 'object') {
    return res.status(400).json({ error: 'Body must be a JSON object of key-value pairs' });
  }
  database.settings.setMultiple(entries);
  res.json(database.settings.getAll());
});

module.exports = router;
