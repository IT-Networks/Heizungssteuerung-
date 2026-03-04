const Database = require('better-sqlite3');
const path = require('path');
const config = require('../config');

const DB_PATH = path.join(config.dataPath, 'heizung.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  // Check if we need to migrate from old schema (resource_id as primary key)
  const tableInfo = db.prepare("PRAGMA table_info(mappings)").all();
  const hasOldSchema = tableInfo.length > 0 &&
    tableInfo.some(col => col.name === 'resource_id' && col.pk === 1);

  if (hasOldSchema) {
    console.log('[Database] Migrating mappings table to support multiple devices per resource...');
    db.exec(`
      ALTER TABLE mappings RENAME TO mappings_old;

      CREATE TABLE mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resource_id INTEGER NOT NULL,
        resource_name TEXT NOT NULL DEFAULT '',
        device_id TEXT NOT NULL,
        device_name TEXT NOT NULL DEFAULT '',
        target_temperature REAL NOT NULL DEFAULT 21.0,
        idle_temperature REAL NOT NULL DEFAULT 16.0,
        preheat_minutes INTEGER NOT NULL DEFAULT 30,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        UNIQUE(resource_id, device_id)
      );

      INSERT INTO mappings (resource_id, resource_name, device_id, device_name,
        target_temperature, idle_temperature, preheat_minutes, enabled, created_at, updated_at)
      SELECT resource_id, resource_name, device_id, device_name,
        target_temperature, idle_temperature, preheat_minutes, enabled, created_at, updated_at
      FROM mappings_old;

      DROP TABLE mappings_old;
    `);
    console.log('[Database] Migration complete');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_id INTEGER NOT NULL,
      resource_name TEXT NOT NULL DEFAULT '',
      device_id TEXT NOT NULL,
      device_name TEXT NOT NULL DEFAULT '',
      target_temperature REAL NOT NULL DEFAULT 21.0,
      idle_temperature REAL NOT NULL DEFAULT 16.0,
      preheat_minutes INTEGER NOT NULL DEFAULT 30,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      UNIQUE(resource_id, device_id)
    );

    CREATE TABLE IF NOT EXISTS battery_status (
      device_id TEXT NOT NULL,
      battery_level INTEGER,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      PRIMARY KEY (device_id, recorded_at)
    );

    CREATE TABLE IF NOT EXISTS heating_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_id INTEGER NOT NULL,
      device_id TEXT NOT NULL,
      action TEXT NOT NULL,
      temperature REAL,
      reason TEXT,
      success INTEGER NOT NULL DEFAULT 1,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS heating_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_id INTEGER NOT NULL,
      device_id TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      duration_minutes INTEGER,
      target_temperature REAL,
      booking_caption TEXT
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'warning',
      resource_id INTEGER,
      device_id TEXT,
      message TEXT NOT NULL,
      acknowledged INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_heating_log_resource ON heating_log(resource_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_heating_log_created ON heating_log(created_at);
    CREATE INDEX IF NOT EXISTS idx_battery_device ON battery_status(device_id, recorded_at);
    CREATE INDEX IF NOT EXISTS idx_heating_sessions_resource ON heating_sessions(resource_id, started_at);
    CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type, acknowledged, created_at);
  `);

  // Seed default settings
  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  );
  const defaults = {
    max_heating_duration_minutes: '180',
    battery_warning_threshold: '20',
    battery_critical_threshold: '10',
    frost_protection_temperature: '5',
    preheat_default_minutes: String(config.scheduler.defaultPreheatMinutes),
    scheduler_interval_minutes: String(config.scheduler.intervalMinutes),
    // Weather settings
    weather_enabled: 'false',
    weather_latitude: '',
    weather_longitude: '',
    weather_threshold: '15',
  };
  for (const [key, value] of Object.entries(defaults)) {
    insertSetting.run(key, value);
  }

  console.log('[Database] Schema initialized');
}

// ── Mappings ──

const mappingsDb = {
  getAll() {
    return getDb().prepare('SELECT * FROM mappings ORDER BY resource_name, device_name').all().map(toMapping);
  },

  getByResourceId(resourceId) {
    // Returns all mappings for a resource (multiple devices possible)
    return getDb().prepare('SELECT * FROM mappings WHERE resource_id = ?').all(resourceId).map(toMapping);
  },

  getByDeviceId(deviceId) {
    const row = getDb().prepare('SELECT * FROM mappings WHERE device_id = ?').get(deviceId);
    return row ? toMapping(row) : null;
  },

  getById(id) {
    const row = getDb().prepare('SELECT * FROM mappings WHERE id = ?').get(id);
    return row ? toMapping(row) : null;
  },

  upsert(mapping) {
    getDb().prepare(`
      INSERT INTO mappings (resource_id, resource_name, device_id, device_name,
        target_temperature, idle_temperature, preheat_minutes, enabled, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))
      ON CONFLICT(resource_id, device_id) DO UPDATE SET
        resource_name = excluded.resource_name,
        device_name = excluded.device_name,
        target_temperature = excluded.target_temperature,
        idle_temperature = excluded.idle_temperature,
        preheat_minutes = excluded.preheat_minutes,
        enabled = excluded.enabled,
        updated_at = datetime('now','localtime')
    `).run(
      mapping.resourceId,
      mapping.resourceName || '',
      mapping.deviceId,
      mapping.deviceName || '',
      mapping.targetTemperature ?? 21,
      mapping.idleTemperature ?? 16,
      mapping.preheatMinutes ?? 30,
      mapping.enabled !== false ? 1 : 0
    );
    return this.getByDeviceId(mapping.deviceId);
  },

  remove(id) {
    getDb().prepare('DELETE FROM mappings WHERE id = ?').run(id);
  },

  removeByResourceId(resourceId) {
    getDb().prepare('DELETE FROM mappings WHERE resource_id = ?').run(resourceId);
  },
};

function toMapping(row) {
  return {
    id: row.id,
    resourceId: row.resource_id,
    resourceName: row.resource_name,
    deviceId: row.device_id,
    deviceName: row.device_name,
    targetTemperature: row.target_temperature,
    idleTemperature: row.idle_temperature,
    preheatMinutes: row.preheat_minutes,
    enabled: !!row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Battery Status ──

const batteryDb = {
  record(deviceId, batteryLevel) {
    getDb().prepare(
      'INSERT INTO battery_status (device_id, battery_level) VALUES (?, ?)'
    ).run(deviceId, batteryLevel);
  },

  getLatest(deviceId) {
    return getDb().prepare(
      'SELECT * FROM battery_status WHERE device_id = ? ORDER BY recorded_at DESC LIMIT 1'
    ).get(deviceId);
  },

  getAll() {
    return getDb().prepare(`
      SELECT bs.* FROM battery_status bs
      INNER JOIN (
        SELECT device_id, MAX(recorded_at) as max_at
        FROM battery_status GROUP BY device_id
      ) latest ON bs.device_id = latest.device_id AND bs.recorded_at = latest.max_at
      ORDER BY bs.battery_level ASC
    `).all();
  },

  getHistory(deviceId, days = 30) {
    return getDb().prepare(`
      SELECT * FROM battery_status
      WHERE device_id = ? AND recorded_at >= datetime('now','localtime', ?)
      ORDER BY recorded_at ASC
    `).all(deviceId, `-${days} days`);
  },

  cleanup(olderThanDays = 90) {
    getDb().prepare(
      "DELETE FROM battery_status WHERE recorded_at < datetime('now','localtime', ?)"
    ).run(`-${olderThanDays} days`);
  },
};

// ── Heating Log ──

const heatingLogDb = {
  add(entry) {
    getDb().prepare(`
      INSERT INTO heating_log (resource_id, device_id, action, temperature, reason, success, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.resourceId,
      entry.deviceId,
      entry.action,
      entry.temperature,
      entry.reason,
      entry.success ? 1 : 0,
      entry.errorMessage || null
    );
  },

  getRecent(limit = 100) {
    return getDb().prepare(
      'SELECT * FROM heating_log ORDER BY created_at DESC LIMIT ?'
    ).all(limit);
  },

  getByResource(resourceId, days = 7) {
    return getDb().prepare(`
      SELECT * FROM heating_log
      WHERE resource_id = ? AND created_at >= datetime('now','localtime', ?)
      ORDER BY created_at DESC
    `).all(resourceId, `-${days} days`);
  },

  cleanup(olderThanDays = 30) {
    getDb().prepare(
      "DELETE FROM heating_log WHERE created_at < datetime('now','localtime', ?)"
    ).run(`-${olderThanDays} days`);
  },
};

// ── Heating Sessions (for extended heating monitoring) ──

const sessionsDb = {
  startSession(resourceId, deviceId, targetTemperature, bookingCaption) {
    // Check if there's already an open session
    const existing = getDb().prepare(
      'SELECT id FROM heating_sessions WHERE resource_id = ? AND ended_at IS NULL'
    ).get(resourceId);
    if (existing) return existing.id;

    const result = getDb().prepare(`
      INSERT INTO heating_sessions (resource_id, device_id, started_at, target_temperature, booking_caption)
      VALUES (?, ?, datetime('now','localtime'), ?, ?)
    `).run(resourceId, deviceId, targetTemperature, bookingCaption || null);
    return result.lastInsertRowid;
  },

  endSession(resourceId) {
    getDb().prepare(`
      UPDATE heating_sessions
      SET ended_at = datetime('now','localtime'),
          duration_minutes = CAST((julianday('now','localtime') - julianday(started_at)) * 1440 AS INTEGER)
      WHERE resource_id = ? AND ended_at IS NULL
    `).run(resourceId);
  },

  getActive() {
    return getDb().prepare(`
      SELECT *,
        CAST((julianday('now','localtime') - julianday(started_at)) * 1440 AS INTEGER) as current_duration_minutes
      FROM heating_sessions
      WHERE ended_at IS NULL
      ORDER BY started_at ASC
    `).all();
  },

  getOverlong(maxMinutes) {
    return getDb().prepare(`
      SELECT *,
        CAST((julianday('now','localtime') - julianday(started_at)) * 1440 AS INTEGER) as current_duration_minutes
      FROM heating_sessions
      WHERE ended_at IS NULL
        AND CAST((julianday('now','localtime') - julianday(started_at)) * 1440 AS INTEGER) > ?
      ORDER BY started_at ASC
    `).all(maxMinutes);
  },

  getHistory(resourceId, days = 30) {
    return getDb().prepare(`
      SELECT * FROM heating_sessions
      WHERE resource_id = ? AND started_at >= datetime('now','localtime', ?)
      ORDER BY started_at DESC
    `).all(resourceId, `-${days} days`);
  },
};

// ── Alerts ──

const alertsDb = {
  create(alert) {
    getDb().prepare(`
      INSERT INTO alerts (type, severity, resource_id, device_id, message)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      alert.type,
      alert.severity || 'warning',
      alert.resourceId || null,
      alert.deviceId || null,
      alert.message
    );
  },

  getActive(limit = 50) {
    return getDb().prepare(
      'SELECT * FROM alerts WHERE acknowledged = 0 ORDER BY created_at DESC LIMIT ?'
    ).all(limit);
  },

  getAll(limit = 100) {
    return getDb().prepare(
      'SELECT * FROM alerts ORDER BY created_at DESC LIMIT ?'
    ).all(limit);
  },

  acknowledge(id) {
    getDb().prepare('UPDATE alerts SET acknowledged = 1 WHERE id = ?').run(id);
  },

  acknowledgeAll() {
    getDb().prepare('UPDATE alerts SET acknowledged = 1 WHERE acknowledged = 0').run();
  },

  cleanup(olderThanDays = 90) {
    getDb().prepare(
      "DELETE FROM alerts WHERE acknowledged = 1 AND created_at < datetime('now','localtime', ?)"
    ).run(`-${olderThanDays} days`);
  },
};

// ── Settings ──

const settingsDb = {
  get(key) {
    const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : null;
  },

  getAll() {
    const rows = getDb().prepare('SELECT key, value FROM settings').all();
    const result = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  },

  set(key, value) {
    getDb().prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, datetime('now','localtime'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now','localtime')
    `).run(key, String(value));
  },

  setMultiple(entries) {
    const stmt = getDb().prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, datetime('now','localtime'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now','localtime')
    `);
    const transaction = getDb().transaction((items) => {
      for (const [key, value] of Object.entries(items)) {
        stmt.run(key, String(value));
      }
    });
    transaction(entries);
  },
};

// ── Migrate from JSON ──

function migrateFromJson() {
  const fs = require('fs');
  const jsonPath = path.join(config.dataPath, 'mappings.json');
  if (!fs.existsSync(jsonPath)) return;

  try {
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const mappings = JSON.parse(raw);
    if (mappings.length > 0) {
      console.log(`[Database] Migrating ${mappings.length} mappings from JSON...`);
      for (const m of mappings) {
        mappingsDb.upsert(m);
      }
      // Rename old file
      fs.renameSync(jsonPath, jsonPath + '.migrated');
      console.log('[Database] Migration complete');
    }
  } catch (err) {
    console.warn('[Database] JSON migration failed:', err.message);
  }
}

// Initialize on first import
getDb();
migrateFromJson();

module.exports = {
  getDb,
  mappings: mappingsDb,
  battery: batteryDb,
  heatingLog: heatingLogDb,
  sessions: sessionsDb,
  alerts: alertsDb,
  settings: settingsDb,
};
