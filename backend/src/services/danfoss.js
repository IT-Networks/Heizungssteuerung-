const axios = require('axios');
const config = require('../config');

class DanfossService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiresAt = 0;
    this.client = axios.create({
      baseURL: config.danfoss.baseUrl,
      headers: {
        'Accept': 'application/json',
      },
    });
  }

  async getToken() {
    // Refresh 30 seconds before expiry
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 30000) {
      return this.accessToken;
    }

    const credentials = Buffer.from(
      `${config.danfoss.apiKey}:${config.danfoss.apiSecret}`
    ).toString('base64');

    try {
      const response = await this.client.post(
        '/oauth2/token',
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${credentials}`,
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = Date.now() + (response.data.expires_in * 1000);
      console.log('[Danfoss] Token acquired, expires in', response.data.expires_in, 'seconds');
      return this.accessToken;
    } catch (error) {
      console.error('[Danfoss] Token request failed:', error.message);
      throw error;
    }
  }

  async request(method, path, data = null) {
    const token = await this.getToken();
    const options = {
      method,
      url: path,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    };
    if (data) options.data = data;

    try {
      const response = await this.client(options);
      return response.data;
    } catch (error) {
      console.error(`[Danfoss] API error ${method} ${path}:`, error.message);
      throw error;
    }
  }

  async getDevices() {
    const result = await this.request('GET', '/ally/devices');
    return result.result || [];
  }

  async getDevice(deviceId) {
    const result = await this.request('GET', `/ally/devices/${deviceId}`);
    return result.result || null;
  }

  async sendCommands(deviceId, commands) {
    const result = await this.request('POST', `/ally/devices/${deviceId}/commands`, {
      commands,
    });
    return result;
  }

  /**
   * Set thermostat temperature.
   * @param {string} deviceId
   * @param {number} temperature - Temperature in °C (e.g. 21.5)
   */
  async setTemperature(deviceId, temperature) {
    // Danfoss API expects temperature in tenths of a degree
    const value = Math.round(temperature * 10);
    return this.sendCommands(deviceId, [
      { code: 'manual_mode_fast', value },
    ]);
  }

  /**
   * Set thermostat mode.
   * @param {string} deviceId
   * @param {'at_home'|'leaving_home'} mode
   */
  async setMode(deviceId, mode) {
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0');

    const modeCode = mode === 'at_home' ? '010000' : '000101';

    return this.sendCommands(deviceId, [
      { code: 'mode', value: timestamp + modeCode },
    ]);
  }
}

module.exports = new DanfossService();
