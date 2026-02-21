const express = require('express');
const database = require('../services/database');

const router = express.Router();

// GET /api/monitor/sessions - active heating sessions
router.get('/sessions', (req, res) => {
  const sessions = database.sessions.getActive();
  res.json(sessions);
});

// GET /api/monitor/sessions/history/:resourceId
router.get('/sessions/history/:resourceId', (req, res) => {
  const days = parseInt(req.query.days || '30', 10);
  const history = database.sessions.getHistory(Number(req.params.resourceId), days);
  res.json(history);
});

// GET /api/monitor/log - heating activity log
router.get('/log', (req, res) => {
  const limit = parseInt(req.query.limit || '100', 10);
  const logs = database.heatingLog.getRecent(limit);
  res.json(logs);
});

// GET /api/monitor/log/:resourceId
router.get('/log/:resourceId', (req, res) => {
  const days = parseInt(req.query.days || '7', 10);
  const logs = database.heatingLog.getByResource(Number(req.params.resourceId), days);
  res.json(logs);
});

module.exports = router;
