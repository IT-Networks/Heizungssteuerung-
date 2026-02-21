const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  churchtools: {
    url: process.env.CHURCHTOOLS_URL || '',
    loginToken: process.env.CHURCHTOOLS_LOGIN_TOKEN || '',
  },

  danfoss: {
    apiKey: process.env.DANFOSS_API_KEY || '',
    apiSecret: process.env.DANFOSS_API_SECRET || '',
    baseUrl: 'https://api.danfoss.com',
  },

  scheduler: {
    intervalMinutes: parseInt(process.env.SCHEDULER_INTERVAL_MINUTES || '5', 10),
    defaultPreheatMinutes: parseInt(process.env.DEFAULT_PREHEAT_MINUTES || '30', 10),
    defaultIdleTemperature: parseInt(process.env.DEFAULT_IDLE_TEMPERATURE || '160', 10),
  },

  dataPath: process.env.DATA_PATH || '/app/data',
};

module.exports = config;
