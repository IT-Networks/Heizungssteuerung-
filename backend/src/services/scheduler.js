const cron = require('node-cron');
const config = require('../config');
const churchtools = require('./churchtools');
const danfoss = require('./danfoss');
const store = require('./store');

class HeatingScheduler {
  constructor() {
    this.task = null;
    this.lastRun = null;
    this.lastResults = [];
  }

  start() {
    const interval = config.scheduler.intervalMinutes;
    // Run every N minutes
    this.task = cron.schedule(`*/${interval} * * * *`, () => {
      this.run().catch(err => {
        console.error('[Scheduler] Error:', err.message);
      });
    });
    console.log(`[Scheduler] Started, checking every ${interval} minutes`);

    // Run immediately on start
    this.run().catch(err => {
      console.error('[Scheduler] Initial run error:', err.message);
    });
  }

  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('[Scheduler] Stopped');
    }
  }

  async run() {
    const mappings = store.getAll().filter(m => m.enabled);
    if (mappings.length === 0) {
      this.lastRun = new Date().toISOString();
      this.lastResults = [];
      return;
    }

    console.log(`[Scheduler] Checking ${mappings.length} mappings...`);

    const now = new Date();
    const results = [];

    // Fetch bookings for today and tomorrow (to handle preheat across midnight)
    const from = formatDate(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const to = formatDate(tomorrow);

    const resourceIds = mappings.map(m => m.resourceId);

    let bookings = [];
    try {
      bookings = await churchtools.getBookings({
        resource_ids: resourceIds,
        from,
        to,
      });
    } catch (error) {
      console.error('[Scheduler] Failed to fetch bookings:', error.message);
      this.lastRun = now.toISOString();
      this.lastResults = [{ error: error.message }];
      return;
    }

    for (const mapping of mappings) {
      const result = {
        resourceId: mapping.resourceId,
        resourceName: mapping.resourceName,
        deviceId: mapping.deviceId,
        action: null,
        temperature: null,
        reason: null,
      };

      try {
        // Find active or upcoming bookings for this resource
        const resourceBookings = bookings.filter(b => {
          const bResourceId = b.base?.resource?.id || b.resource_id;
          return bResourceId === mapping.resourceId;
        });

        const { shouldHeat, reason } = this.evaluateBookings(
          resourceBookings,
          now,
          mapping.preheatMinutes || config.scheduler.defaultPreheatMinutes
        );

        const targetTemp = shouldHeat
          ? mapping.targetTemperature
          : (mapping.idleTemperature || config.scheduler.defaultIdleTemperature / 10);

        result.temperature = targetTemp;
        result.reason = reason;
        result.action = shouldHeat ? 'heating' : 'idle';

        await danfoss.setTemperature(mapping.deviceId, targetTemp);
        result.success = true;
      } catch (error) {
        result.success = false;
        result.error = error.message;
        console.error(`[Scheduler] Failed for resource ${mapping.resourceName}:`, error.message);
      }

      results.push(result);
    }

    this.lastRun = now.toISOString();
    this.lastResults = results;
    console.log(`[Scheduler] Completed. ${results.filter(r => r.success).length}/${results.length} successful`);
  }

  /**
   * Determine if heating should be active based on bookings.
   */
  evaluateBookings(bookings, now, preheatMinutes) {
    for (const booking of bookings) {
      const startTime = new Date(booking.startDate || booking.calculated_startdate);
      const endTime = new Date(booking.endDate || booking.calculated_enddate);
      const preheatStart = new Date(startTime.getTime() - preheatMinutes * 60000);

      // Currently in a booking
      if (now >= startTime && now <= endTime) {
        return {
          shouldHeat: true,
          reason: `Active booking: ${booking.caption || booking.base?.caption || 'Booking'} (until ${endTime.toLocaleTimeString('de-DE')})`,
        };
      }

      // Preheating for upcoming booking
      if (now >= preheatStart && now < startTime) {
        return {
          shouldHeat: true,
          reason: `Preheating for: ${booking.caption || booking.base?.caption || 'Booking'} (starts ${startTime.toLocaleTimeString('de-DE')})`,
        };
      }
    }

    return {
      shouldHeat: false,
      reason: 'No active or upcoming bookings',
    };
  }

  getStatus() {
    return {
      lastRun: this.lastRun,
      results: this.lastResults,
      intervalMinutes: config.scheduler.intervalMinutes,
      running: !!this.task,
    };
  }
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

module.exports = new HeatingScheduler();
