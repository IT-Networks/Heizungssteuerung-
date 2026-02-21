const express = require('express');
const churchtools = require('../services/churchtools');

const router = express.Router();

// GET /api/bookings - list bookings with optional filters
router.get('/', async (req, res) => {
  try {
    const params = {};

    if (req.query.resource_ids) {
      params.resource_ids = Array.isArray(req.query.resource_ids)
        ? req.query.resource_ids.map(Number)
        : [Number(req.query.resource_ids)];
    }

    if (req.query.from) params.from = req.query.from;
    if (req.query.to) params.to = req.query.to;
    if (req.query.status_ids) {
      params.status_ids = Array.isArray(req.query.status_ids)
        ? req.query.status_ids.map(Number)
        : [Number(req.query.status_ids)];
    }

    const bookings = await churchtools.getBookings(params);
    res.json(bookings);
  } catch (error) {
    console.error('[API] GET /bookings error:', error.message);
    res.status(502).json({ error: 'Failed to fetch bookings from ChurchTools' });
  }
});

module.exports = router;
