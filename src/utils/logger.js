import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Custom log format
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

/**
 * Console format with colors
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} ${level}: ${message}`;
  })
);

/**
 * Create logger instance
 */
class Logger {
  constructor(options = {}) {
    const {
      level = 'info',
      logDir = './logs',
      maxFiles = '14d',
    } = options;

    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Create transports
    const transports = [
      // Console output
      new winston.transports.Console({
        format: consoleFormat,
        level: level,
      }),

      // Error log file
      new DailyRotateFile({
        filename: path.join(logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxFiles: maxFiles,
        format: logFormat,
      }),

      // Combined log file
      new DailyRotateFile({
        filename: path.join(logDir, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxFiles: maxFiles,
        format: logFormat,
      }),
    ];

    // Create Winston logger
    this.logger = winston.createLogger({
      level: level,
      transports: transports,
      exitOnError: false,
    });

    // Log uncaught exceptions and unhandled rejections
    this.logger.exceptions.handle(
      new DailyRotateFile({
        filename: path.join(logDir, 'exceptions-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxFiles: maxFiles,
        format: logFormat,
      })
    );

    this.logger.rejections.handle(
      new DailyRotateFile({
        filename: path.join(logDir, 'rejections-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxFiles: maxFiles,
        format: logFormat,
      })
    );
  }

  /**
     * Log error message
     */
  error(message, meta = {}) {
    this.logger.error(message, meta);
  }

  /**
     * Log warning message
     */
  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  /**
     * Log info message
     */
  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  /**
     * Log debug message
     */
  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  /**
     * Create child logger with additional metadata
     */
  child(metadata) {
    return this.logger.child(metadata);
  }
}

// Export singleton instance
let loggerInstance = null;

export function initLogger(options) {
  if (!loggerInstance) {
    loggerInstance = new Logger(options);
  }
  return loggerInstance;
}

export function getLogger() {
  if (!loggerInstance) {
    throw new Error('Logger not initialized. Call initLogger() first.');
  }
  return loggerInstance;
}

export default Logger;
