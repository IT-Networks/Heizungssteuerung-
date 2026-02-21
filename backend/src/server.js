const express = require('express');
const cors = require('cors');
const config = require('./config');
const churchtools = require('./services/churchtools');
const scheduler = require('./services/scheduler');

const resourceRoutes = require('./routes/resources');
const bookingRoutes = require('./routes/bookings');
const deviceRoutes = require('./routes/devices');
const mappingRoutes = require('./routes/mappings');
const schedulerRoutes = require('./routes/scheduler');

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/resources', resourceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/mappings', mappingRoutes);
app.use('/api/scheduler', schedulerRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    churchtools: !!config.churchtools.url,
    danfoss: !!config.danfoss.apiKey,
  });
});

async function start() {
  // Initialize ChurchTools session
  if (config.churchtools.url && config.churchtools.loginToken) {
    try {
      await churchtools.init();
    } catch (error) {
      console.warn('[Server] ChurchTools init failed – continuing without:', error.message);
    }
  } else {
    console.warn('[Server] ChurchTools not configured – set CHURCHTOOLS_URL and CHURCHTOOLS_LOGIN_TOKEN');
  }

  // Start heating scheduler
  scheduler.start();

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`[Server] Heizungssteuerung running on port ${config.port}`);
  });
}

start().catch(err => {
  console.error('[Server] Fatal error:', err);
  process.exit(1);
});
