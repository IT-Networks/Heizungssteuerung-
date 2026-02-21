const axios = require('axios');
const config = require('../config');

class ChurchToolsService {
  constructor() {
    this.client = null;
    this.sessionCookie = null;
  }

  async init() {
    this.client = axios.create({
      baseURL: config.churchtools.url,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // Authenticate with login token to get session cookie
    await this.authenticate();
  }

  async authenticate() {
    try {
      const response = await this.client.get('/api/whoami', {
        headers: {
          'Authorization': `Login ${config.churchtools.loginToken}`,
        },
      });

      // Extract session cookie from response
      const setCookie = response.headers['set-cookie'];
      if (setCookie) {
        this.sessionCookie = setCookie
          .map(c => c.split(';')[0])
          .join('; ');
      }

      console.log(`[ChurchTools] Authenticated as ${response.data.data?.firstName || 'user'}`);
      return response.data;
    } catch (error) {
      console.error('[ChurchTools] Authentication failed:', error.message);
      throw error;
    }
  }

  getHeaders() {
    const headers = {};
    if (this.sessionCookie) {
      headers['Cookie'] = this.sessionCookie;
    } else {
      headers['Authorization'] = `Login ${config.churchtools.loginToken}`;
    }
    return headers;
  }

  async request(method, path, data = null) {
    try {
      const options = {
        method,
        url: path,
        headers: this.getHeaders(),
      };
      if (data) options.data = data;
      const response = await this.client(options);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        // Session expired, re-authenticate
        await this.authenticate();
        const options = {
          method,
          url: path,
          headers: this.getHeaders(),
        };
        if (data) options.data = data;
        const response = await this.client(options);
        return response.data;
      }
      throw error;
    }
  }

  async getResources() {
    const result = await this.request('GET', '/api/resources');
    return result.data || [];
  }

  async getBookings(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.resource_ids) {
      params.resource_ids.forEach(id => queryParams.append('resource_ids[]', id));
    }
    if (params.from) queryParams.set('from', params.from);
    if (params.to) queryParams.set('to', params.to);
    if (params.status_ids) {
      params.status_ids.forEach(id => queryParams.append('status_ids[]', id));
    }

    const query = queryParams.toString();
    const path = `/api/bookings${query ? '?' + query : ''}`;
    const result = await this.request('GET', path);
    return result.data || [];
  }

  async getResourceTypes() {
    const result = await this.request('GET', '/api/resource/masterdata');
    return result.data || {};
  }
}

module.exports = new ChurchToolsService();
