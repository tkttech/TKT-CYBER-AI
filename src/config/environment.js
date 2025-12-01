import dotenv from 'dotenv';
import Joi from 'joi';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

/**
 * Configuration schema validation
 */
const configSchema = Joi.object({
  // Bot Configuration
  botName: Joi.string().default('Vesperr'),
  prefix: Joi.string().default('!'),
  ownerNumber: Joi.string().allow('').default(''),
  pastebinRawUrl: Joi.string().uri().allow('').default(''),
  sessionFile: Joi.string().default('./data/session'),
  pluginsDir: Joi.string().default('./plugins'),

  // Database Configuration
  db: Joi.object({
    type: Joi.string().valid('sqlite', 'postgres').default('sqlite'),
    path: Joi.string().default('./data/vesperr.db'),
    host: Joi.string().when('type', { is: 'postgres', then: Joi.required(), otherwise: Joi.optional() }),
    port: Joi.number().when('type', { is: 'postgres', then: Joi.required(), otherwise: Joi.optional() }),
    name: Joi.string().when('type', { is: 'postgres', then: Joi.required(), otherwise: Joi.optional() }),
    user: Joi.string().when('type', { is: 'postgres', then: Joi.required(), otherwise: Joi.optional() }),
    password: Joi.string().when('type', { is: 'postgres', then: Joi.required(), otherwise: Joi.optional() }),
  }).default(),

  // Logging Configuration
  logging: Joi.object({
    level: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
    dir: Joi.string().default('./logs'),
    maxFiles: Joi.string().default('14d'),
  }).default(),

  // AI Configuration
  ai: Joi.object({
    googleApiKey: Joi.string().allow('').default(''),
    openaiApiKey: Joi.string().allow('').default(''),
  }).default(),

  // Weather API
  weather: Joi.object({
    apiKey: Joi.string().allow('').default(''),
  }).default(),

  // Rate Limiting
  rateLimit: Joi.object({
    maxRequests: Joi.number().default(10),
    windowMs: Joi.number().default(60000),
  }).default(),

  // Health Check
  healthCheck: Joi.object({
    port: Joi.number().default(3000),
    enabled: Joi.boolean().default(true),
  }).default(),

  // Features
  features: Joi.object({
    analytics: Joi.boolean().default(true),
    autoReconnect: Joi.boolean().default(true),
  }).default(),

  // Security
  security: Joi.object({
    maxMessageLength: Joi.number().default(10000),
    allowedFileTypes: Joi.array().items(Joi.string()).default(['image', 'video', 'audio', 'document']),
  }).default(),
}).unknown(true);

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig() {
  const rawConfig = {
    botName: process.env.BOT_NAME,
    prefix: process.env.PREFIX,
    ownerNumber: process.env.OWNER_NUMBER,
    pastebinRawUrl: process.env.PASTEBIN_RAW_URL,
    sessionFile: process.env.SESSION_FILE,
    pluginsDir: process.env.PLUGINS_DIR,

    db: {
      type: process.env.DB_TYPE,
      path: process.env.DB_PATH,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
      name: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },

    logging: {
      level: process.env.LOG_LEVEL,
      dir: process.env.LOG_DIR,
      maxFiles: process.env.LOG_MAX_FILES,
    },

    ai: {
      googleApiKey: process.env.GOOGLE_AI_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
    },

    weather: {
      apiKey: process.env.OPENWEATHER_API_KEY,
    },

    rateLimit: {
      maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) : undefined,
      windowMs: process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS) : undefined,
    },

    healthCheck: {
      port: process.env.HEALTH_CHECK_PORT ? parseInt(process.env.HEALTH_CHECK_PORT) : undefined,
      enabled: process.env.HEALTH_CHECK_ENABLED === 'true',
    },

    features: {
      analytics: process.env.ENABLE_ANALYTICS !== 'false',
      autoReconnect: process.env.ENABLE_AUTO_RECONNECT !== 'false',
    },

    security: {
      maxMessageLength: process.env.MAX_MESSAGE_LENGTH ? parseInt(process.env.MAX_MESSAGE_LENGTH) : undefined,
      allowedFileTypes: process.env.ALLOWED_FILE_TYPES ? process.env.ALLOWED_FILE_TYPES.split(',') : undefined,
    },
  };

  const { error, value } = configSchema.validate(rawConfig, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    throw new Error(`Configuration validation failed: ${error.message}`);
  }

  // Defensive fix: If sessionFile is still ./vesperr (e.g. from env var), force it to ./data/session
  if (value.sessionFile === './vesperr') {
    console.warn('⚠️  WARNING: sessionFile was set to ./vesperr (likely via env var). Forcing to ./data/session to prevent permission errors.');
    value.sessionFile = './data/session';
  }

  return value;
}

// Export validated configuration
const config = loadConfig();

export default config;
