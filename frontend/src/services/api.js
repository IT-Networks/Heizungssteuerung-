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

  // Health
  getHealth: () => request('/health'),
};
