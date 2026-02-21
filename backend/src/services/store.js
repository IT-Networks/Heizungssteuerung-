const fs = require('fs');
const path = require('path');
const config = require('../config');

const DATA_FILE = path.join(config.dataPath, 'mappings.json');

/**
 * Persistent store for resource-to-thermostat mappings and settings.
 *
 * Each mapping:
 * {
 *   resourceId: number,        // ChurchTools resource ID
 *   resourceName: string,
 *   deviceId: string,           // Danfoss device ID
 *   deviceName: string,
 *   targetTemperature: number,  // Desired temperature during booking (°C, e.g. 21.0)
 *   idleTemperature: number,    // Temperature when no booking (°C, e.g. 16.0)
 *   preheatMinutes: number,     // How many minutes before booking to start heating
 *   enabled: boolean,
 * }
 */
class MappingStore {
  constructor() {
    this.mappings = [];
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.mappings = JSON.parse(raw);
        console.log(`[Store] Loaded ${this.mappings.length} mappings`);
      }
    } catch (error) {
      console.error('[Store] Failed to load mappings:', error.message);
      this.mappings = [];
    }
  }

  save() {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.mappings, null, 2));
    } catch (error) {
      console.error('[Store] Failed to save mappings:', error.message);
    }
  }

  getAll() {
    return this.mappings;
  }

  getByResourceId(resourceId) {
    return this.mappings.find(m => m.resourceId === resourceId) || null;
  }

  getByDeviceId(deviceId) {
    return this.mappings.find(m => m.deviceId === deviceId) || null;
  }

  upsert(mapping) {
    const index = this.mappings.findIndex(m => m.resourceId === mapping.resourceId);
    if (index >= 0) {
      this.mappings[index] = { ...this.mappings[index], ...mapping };
    } else {
      this.mappings.push(mapping);
    }
    this.save();
    return this.getByResourceId(mapping.resourceId);
  }

  remove(resourceId) {
    this.mappings = this.mappings.filter(m => m.resourceId !== resourceId);
    this.save();
  }
}

module.exports = new MappingStore();
