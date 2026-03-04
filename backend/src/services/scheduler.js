const cron = require('node-cron');
const config = require('../config');
const churchtools = require('./churchtools');
const danfoss = require('./danfoss');
const database = require('./database');
const weather = require('./weather');

// Patterns to detect "heating off" in resource description (case insensitive)
const HEATING_OFF_PATTERNS = [
  /heizung\s*aus/i,
  /keine\s*heizung/i,
  /nicht\s*heizen/i,
  /heating\s*off/i,
  /no\s*heating/i,
];

class HeatingScheduler {
  constructor() {
    this.task = null;
    this.batteryTask = null;
    this.monitorTask = null;
    this.lastRun = null;
    this.lastResults = [];
  }

  start() {
    const interval = config.scheduler.intervalMinutes;

    this.task = cron.schedule(`*/${interval} * * * *`, () => {
      this.run().catch(err => console.error('[Scheduler] Error:', err.message));
    });
    console.log(`[Scheduler] Started, checking every ${interval} minutes`);

    this.batteryTask = cron.schedule('0 * * * *', () => {
      this.checkBatteryLevels().catch(err => console.error('[Scheduler] Battery check error:', err.message));
    });
    console.log('[Scheduler] Battery monitoring started (hourly)');

    this.monitorTask = cron.schedule('*/10 * * * *', () => {
      this.checkExtendedHeating().catch(err => console.error('[Scheduler] Heating monitor error:', err.message));
    });
    console.log('[Scheduler] Extended heating monitor started');

    this.run().catch(err => console.error('[Scheduler] Initial run error:', err.message));

    setTimeout(() => {
      this.checkBatteryLevels().catch(err => console.error('[Scheduler] Initial battery check error:', err.message));
    }, 5000);
  }

  stop() {
    if (this.task) { this.task.stop(); this.task = null; }
    if (this.batteryTask) { this.batteryTask.stop(); this.batteryTask = null; }
    if (this.monitorTask) { this.monitorTask.stop(); this.monitorTask = null; }
    console.log('[Scheduler] Stopped');
  }

  async run() {
    const mappings = database.mappings.getAll().filter(m => m.enabled);
    if (mappings.length === 0) {
      this.lastRun = new Date().toISOString();
      this.lastResults = [];
      return;
    }

    console.log(`[Scheduler] Checking ${mappings.length} mappings...`);

    const now = new Date();
    const results = [];

    // Check outdoor temperature first (global setting)
    const weatherCheck = await weather.shouldSkipHeating();
    if (weatherCheck.skip) {
      console.log(`[Scheduler] Skipping heating: ${weatherCheck.reason}`);
    }

    const from = formatDate(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const to = formatDate(tomorrow);

    const resourceIds = [...new Set(mappings.map(m => m.resourceId))];

    let bookings = [];
    let resources = [];
    try {
      [bookings, resources] = await Promise.all([
        churchtools.getBookings({ resource_ids: resourceIds, from, to }),
        churchtools.getResources(),
      ]);
      console.log(`[Scheduler] Fetched ${bookings.length} bookings for ${resourceIds.length} resources (${from} to ${to})`);
      if (bookings.length > 0) {
        // Log first booking structure for debugging
        const sample = bookings[0];
        const booking = sample.booking || sample;
        const calculated = booking.calculated || {};
        const base = booking.base || booking;
        console.log('[Scheduler] Sample booking structure:', {
          hasBookingWrapper: !!sample.booking,
          hasCalculated: !!booking.calculated,
          hasBase: !!booking.base,
          startDate: calculated.startDate || base.startDate || booking.startDate,
          resourceId: base.resource?.id || booking.resource_id,
        });
      }
    } catch (error) {
      console.error('[Scheduler] Failed to fetch data:', error.message);
      this.lastRun = now.toISOString();
      this.lastResults = [{ error: error.message }];
      return;
    }

    // Create resource map for quick lookup
    const resourceMap = new Map(resources.map(r => [r.id, r]));

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
        // Check resource description for "heating off" patterns
        const resource = resourceMap.get(mapping.resourceId);
        if (resource && this.isHeatingDisabledByDescription(resource.description)) {
          result.action = 'disabled';
          result.temperature = mapping.idleTemperature || config.scheduler.defaultIdleTemperature / 10;
          result.reason = 'Heizung deaktiviert in Ressourcen-Beschreibung ("keine Heizung")';

          console.log(`[Scheduler] ${mapping.resourceName}: Heizung DEAKTIVIERT → ${result.temperature}°C (Beschreibung enthält "keine Heizung")`);

          await danfoss.setTemperature(mapping.deviceId, result.temperature);
          result.success = true;
          database.sessions.endSession(mapping.resourceId);

          database.heatingLog.add({
            resourceId: mapping.resourceId,
            deviceId: mapping.deviceId,
            action: result.action,
            temperature: result.temperature,
            reason: result.reason,
            success: true,
          });

          results.push(result);
          continue;
        }

        // Check weather conditions (outdoor temperature)
        if (weatherCheck.skip) {
          result.action = 'idle';
          result.temperature = mapping.idleTemperature || config.scheduler.defaultIdleTemperature / 10;
          result.reason = weatherCheck.reason;

          await danfoss.setTemperature(mapping.deviceId, result.temperature);
          result.success = true;
          database.sessions.endSession(mapping.resourceId);

          database.heatingLog.add({
            resourceId: mapping.resourceId,
            deviceId: mapping.deviceId,
            action: result.action,
            temperature: result.temperature,
            reason: result.reason,
            success: true,
          });

          results.push(result);
          continue;
        }

        const resourceBookings = bookings.filter(b => {
          const booking = b.booking || b;
          const calculated = booking.calculated || {};
          const base = booking.base || booking;
          const bResourceId = base.resource?.id
            || booking.resource_id
            || b.resource_id
            || calculated.resource_id
            || base.resourceId;
          return Number(bResourceId) === Number(mapping.resourceId);
        });

        console.log(`[Scheduler] ${mapping.resourceName} (ID ${mapping.resourceId}): ${resourceBookings.length} Buchungen gefunden von ${bookings.length} gesamt`);
        if (resourceBookings.length === 0 && bookings.length > 0) {
          // Debug: log what resource IDs the bookings actually have
          const foundIds = bookings.map(b => {
            const booking = b.booking || b;
            const base = booking.base || booking;
            return base.resource?.id || booking.resource_id || b.resource_id || 'unknown';
          });
          console.log(`[Scheduler] Booking resource IDs in API response: [${[...new Set(foundIds)].join(', ')}]`);
          console.log(`[Scheduler] Mapping expects resource ID: ${mapping.resourceId} (type: ${typeof mapping.resourceId})`);
        }

        const { shouldHeat, reason, bookingCaption } = this.evaluateBookings(
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

        // Log state changes
        if (shouldHeat) {
          console.log(`[Scheduler] ${mapping.resourceName}: Heizung AN → ${targetTemp}°C (${reason})`);
          database.sessions.startSession(mapping.resourceId, mapping.deviceId, targetTemp, bookingCaption);
        } else {
          console.log(`[Scheduler] ${mapping.resourceName}: Heizung AUS → ${targetTemp}°C (${reason})`);
          database.sessions.endSession(mapping.resourceId);
        }

        database.heatingLog.add({
          resourceId: mapping.resourceId,
          deviceId: mapping.deviceId,
          action: result.action,
          temperature: targetTemp,
          reason,
          success: true,
        });
      } catch (error) {
        result.success = false;
        result.error = error.message;
        console.error(`[Scheduler] Failed for resource ${mapping.resourceName}:`, error.message);

        database.heatingLog.add({
          resourceId: mapping.resourceId,
          deviceId: mapping.deviceId,
          action: 'error',
          temperature: null,
          reason: result.reason,
          success: false,
          errorMessage: error.message,
        });
      }

      results.push(result);
    }

    this.lastRun = now.toISOString();
    this.lastResults = results;
    const weatherInfo = weatherCheck.outdoorTemp !== null ? ` (Außen: ${weatherCheck.outdoorTemp}°C)` : '';
    console.log(`[Scheduler] Completed. ${results.filter(r => r.success).length}/${results.length} successful${weatherInfo}`);
  }

  /**
   * Check if heating is disabled in resource description
   * @param {string | null} description - Resource description from ChurchTools
   * @returns {boolean}
   */
  isHeatingDisabledByDescription(description) {
    if (!description) return false;
    return HEATING_OFF_PATTERNS.some(pattern => pattern.test(description));
  }

  evaluateBookings(bookings, now, preheatMinutes) {
    for (const item of bookings) {
      // ChurchTools returns nested structure: item.booking or item directly
      const booking = item.booking || item;
      const calculated = booking.calculated || {};
      const base = booking.base || booking;

      // Try multiple date field locations (calculated > base > direct)
      const startTime = new Date(
        calculated.startDate || base.startDate || booking.startDate || booking.calculated_startdate
      );
      const endTime = new Date(
        calculated.endDate || base.endDate || booking.endDate || booking.calculated_enddate
      );
      const preheatStart = new Date(startTime.getTime() - preheatMinutes * 60000);
      const caption = base.title || base.caption || booking.caption || booking.title || 'Buchung';

      if (now >= startTime && now <= endTime) {
        return {
          shouldHeat: true,
          reason: `Aktive Buchung: ${caption} (bis ${endTime.toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })})`,
          bookingCaption: caption,
        };
      }

      if (now >= preheatStart && now < startTime) {
        return {
          shouldHeat: true,
          reason: `Vorheizen für: ${caption} (Start ${startTime.toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin' })})`,
          bookingCaption: caption,
        };
      }
    }

    return {
      shouldHeat: false,
      reason: 'Keine aktiven oder anstehenden Buchungen',
      bookingCaption: null,
    };
  }

  async checkBatteryLevels() {
    console.log('[Scheduler] Checking battery levels...');
    const warningThreshold = parseInt(database.settings.get('battery_warning_threshold') || '20', 10);
    const criticalThreshold = parseInt(database.settings.get('battery_critical_threshold') || '10', 10);

    try {
      const devices = await danfoss.getDevicesWithStatus();

      for (const device of devices) {
        const deviceId = device.id || device.device_id;
        const batteryLevel = device.parsed.batteryLevel;
        if (batteryLevel === null) continue;

        database.battery.record(deviceId, batteryLevel);

        if (batteryLevel <= criticalThreshold) {
          const recentAlerts = database.alerts.getActive();
          const hasRecent = recentAlerts.some(a => a.type === 'battery_critical' && a.device_id === deviceId);
          if (!hasRecent) {
            database.alerts.create({
              type: 'battery_critical',
              severity: 'critical',
              deviceId,
              message: `Batterie kritisch: ${device.name || deviceId} bei ${batteryLevel}%`,
            });
          }
        } else if (batteryLevel <= warningThreshold) {
          const recentAlerts = database.alerts.getActive();
          const hasRecent = recentAlerts.some(a => a.type === 'battery_warning' && a.device_id === deviceId);
          if (!hasRecent) {
            database.alerts.create({
              type: 'battery_warning',
              severity: 'warning',
              deviceId,
              message: `Batterie niedrig: ${device.name || deviceId} bei ${batteryLevel}%`,
            });
          }
        }
      }

      database.battery.cleanup(90);
    } catch (error) {
      console.error('[Scheduler] Battery check failed:', error.message);
    }
  }

  async checkExtendedHeating() {
    const maxMinutes = parseInt(database.settings.get('max_heating_duration_minutes') || '180', 10);
    const overlong = database.sessions.getOverlong(maxMinutes);

    for (const session of overlong) {
      const recentAlerts = database.alerts.getActive();
      const hasRecent = recentAlerts.some(a => a.type === 'extended_heating' && a.resource_id === session.resource_id);
      if (!hasRecent) {
        const mapping = database.mappings.getByResourceId(session.resource_id);
        const name = mapping?.resourceName || `Ressource ${session.resource_id}`;
        database.alerts.create({
          type: 'extended_heating',
          severity: 'warning',
          resourceId: session.resource_id,
          deviceId: session.device_id,
          message: `Übermäßig langes Heizen: ${name} seit ${session.current_duration_minutes} Min. (Limit: ${maxMinutes} Min.)`,
        });
        console.warn(`[Monitor] Extended heating alert: ${name} - ${session.current_duration_minutes} min`);
      }
    }

    database.heatingLog.cleanup(30);
    database.alerts.cleanup(90);
  }

  getStatus() {
    const activeSessions = database.sessions.getActive();
    return {
      lastRun: this.lastRun,
      results: this.lastResults,
      intervalMinutes: config.scheduler.intervalMinutes,
      running: !!this.task,
      activeSessions: activeSessions.length,
    };
  }
}

function formatDate(date) {
  // Use local German date to avoid UTC date boundary issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

module.exports = new HeatingScheduler();
