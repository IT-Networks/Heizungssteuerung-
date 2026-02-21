const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Resources
  getResources: () => request('/resources'),
  getResourceTypes: () => request('/resources/types'),

  // Bookings
  getBookings: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.resource_ids) {
      params.resource_ids.forEach(id => qs.append('resource_ids', id));
    }
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    const query = qs.toString();
    return request(`/bookings${query ? '?' + query : ''}`);
  },

  // Danfoss Devices
  getDevices: () => request('/devices'),
  getDevice: (id) => request(`/devices/${id}`),
  setTemperature: (id, temperature) =>
    request(`/devices/${id}/temperature`, {
      method: 'POST',
      body: JSON.stringify({ temperature }),
    }),

  // Mappings
  getMappings: () => request('/mappings'),
  saveMapping: (mapping) =>
    request('/mappings', {
      method: 'PUT',
      body: JSON.stringify(mapping),
    }),
  deleteMapping: (resourceId) =>
    request(`/mappings/${resourceId}`, { method: 'DELETE' }),

  // Scheduler
  getSchedulerStatus: () => request('/scheduler/status'),
  runScheduler: () => request('/scheduler/run', { method: 'POST' }),

  // Battery
  getBatteryStatus: () => request('/battery'),
  getBatteryHistory: (deviceId, days = 30) => request(`/battery/${deviceId}/history?days=${days}`),

  // Alerts
  getAlerts: (active = false) => request(`/alerts?active=${active}`),
  getActiveAlerts: () => request('/alerts?active=true'),
  acknowledgeAlert: (id) => request(`/alerts/${id}/acknowledge`, { method: 'POST' }),
  acknowledgeAllAlerts: () => request('/alerts/acknowledge-all', { method: 'POST' }),

  // Settings
  getSettings: () => request('/settings'),
  saveSettings: (settings) =>
    request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  // Monitor
  getActiveSessions: () => request('/monitor/sessions'),
  getSessionHistory: (resourceId, days = 30) => request(`/monitor/sessions/history/${resourceId}?days=${days}`),
  getHeatingLog: (limit = 100) => request(`/monitor/log?limit=${limit}`),

  // Health
  getHealth: () => request('/health'),
};
