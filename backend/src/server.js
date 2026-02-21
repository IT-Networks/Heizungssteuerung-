const express = require('express');
const cors = require('cors');
const config = require('./config');
const churchtools = require('./services/churchtools');
const database = require('./services/database');
const scheduler = require('./services/scheduler');

const resourceRoutes = require('./routes/resources');
const bookingRoutes = require('./routes/bookings');
const deviceRoutes = require('./routes/devices');
const mappingRoutes = require('./routes/mappings');
const schedulerRoutes = require('./routes/scheduler');
const batteryRoutes = require('./routes/battery');
const alertRoutes = require('./routes/alerts');
const settingsRoutes = require('./routes/settings');
const monitorRoutes = require('./routes/monitor');
const weatherRoutes = require('./routes/weather');

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/resources', resourceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/mappings', mappingRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/battery', batteryRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/monitor', monitorRoutes);
app.use('/api/weather', weatherRoutes);

// Health check
app.get('/api/health', (req, res) => {
  const activeAlerts = database.alerts.getActive();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    churchtools: !!config.churchtools.url,
    danfoss: !!config.danfoss.apiKey,
    activeAlerts: activeAlerts.length,
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
