const express = require('express');
const churchtools = require('../services/churchtools');

const router = express.Router();

// GET /api/resources - list all ChurchTools resources
router.get('/', async (req, res) => {
  try {
    const resources = await churchtools.getResources();
    res.json(resources);
  } catch (error) {
    console.error('[API] GET /resources error:', error.message);
    res.status(502).json({ error: 'Failed to fetch resources from ChurchTools' });
  }
});

// GET /api/resources/types - get resource master data (types/groups)
router.get('/types', async (req, res) => {
  try {
    const types = await churchtools.getResourceTypes();
    res.json(types);
  } catch (error) {
    console.error('[API] GET /resources/types error:', error.message);
    res.status(502).json({ error: 'Failed to fetch resource types' });
  }
});

module.exports = router;
