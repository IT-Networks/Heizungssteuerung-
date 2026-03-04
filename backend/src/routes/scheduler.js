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

// GET /api/scheduler/debug - debug booking matching
router.get('/debug', async (req, res) => {
  const churchtools = require('../services/churchtools');
  const database = require('../services/database');

  try {
    const mappings = database.mappings.getAll().filter(m => m.enabled);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const from = `${year}-${month}-${day}`;
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const to = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    const resourceIds = [...new Set(mappings.map(m => m.resourceId))];
    const bookings = await churchtools.getBookings({ resource_ids: resourceIds, from, to });

    // Analyze each booking's structure
    const analysis = bookings.map((b, i) => {
      const booking = b.booking || b;
      const calculated = booking.calculated || {};
      const base = booking.base || booking;

      return {
        index: i,
        topLevelKeys: Object.keys(b),
        hasBookingWrapper: !!b.booking,
        hasBase: !!booking.base,
        hasCalculated: !!booking.calculated,
        resourceId_base_resource_id: base.resource?.id,
        resourceId_booking_resource_id: booking.resource_id,
        resourceId_b_resource_id: b.resource_id,
        resourceId_calculated: calculated.resource_id,
        resourceId_base_resourceId: base.resourceId,
        startDate_calculated: calculated.startDate,
        startDate_base: base.startDate,
        startDate_booking: booking.startDate,
        startDate_calculated_startdate: booking.calculated_startdate,
        endDate_calculated: calculated.endDate,
        endDate_base: base.endDate,
        caption: base.title || base.caption || booking.caption || booking.title,
        statusId: booking.statusId || booking.status_id || base.statusId,
        rawFirstLevel: Object.fromEntries(
          Object.entries(b).filter(([k]) => typeof b[k] !== 'object').slice(0, 15)
        ),
      };
    });

    res.json({
      now: now.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dateRange: { from, to },
      mappings: mappings.map(m => ({
        resourceId: m.resourceId,
        resourceName: m.resourceName,
        deviceId: m.deviceId,
        enabled: m.enabled,
      })),
      requestedResourceIds: resourceIds,
      totalBookings: bookings.length,
      bookingAnalysis: analysis,
      rawFirstBooking: bookings.length > 0 ? bookings[0] : null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

module.exports = router;
