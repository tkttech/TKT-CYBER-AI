/**
 * Custom error classes for better error handling
 */

export class VesperrError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends VesperrError {
  constructor(message) {
    super(message, 400, true);
  }
}

export class AuthenticationError extends VesperrError {
  constructor(message = 'Authentication failed') {
    super(message, 401, true);
  }
}

export class PermissionError extends VesperrError {
  constructor(message = 'Permission denied') {
    super(message, 403, true);
  }
}

export class NotFoundError extends VesperrError {
  constructor(message = 'Resource not found') {
    super(message, 404, true);
  }
}

export class RateLimitError extends VesperrError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, true);
  }
}

export class ExternalServiceError extends VesperrError {
  constructor(message, service) {
    super(`${service} error: ${message}`, 502, true);
    this.service = service;
  }
}

/**
 * Global error handler
 */
export class ErrorHandler {
  constructor(logger) {
    this.logger = logger;
  }

  /**
     * Handle error and determine if app should crash
     */
  handleError(error) {
    this.logger.error('Error occurred', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
    });

    // If it's not an operational error, we should probably exit
    if (!this.isOperationalError(error)) {
      this.logger.error('Non-operational error detected. Application may be in unstable state.');
      return false; // Indicate that restart might be needed
    }

    return true; // Error handled, can continue
  }

  /**
     * Check if error is operational (expected) or programmer error
     */
  isOperationalError(error) {
    if (error instanceof VesperrError) {
      return error.isOperational;
    }
    return false;
  }

  /**
     * Handle specific WhatsApp/Baileys errors
     */
  handleWhatsAppError(error, logger) {
    const errorMessage = error.message || error.toString();

    if (errorMessage.includes('Connection Closed') || errorMessage.includes('Connection Lost')) {
      logger.warn('WhatsApp connection lost. Will attempt to reconnect.');
      return { shouldReconnect: true, fatal: false };
    }

    if (errorMessage.includes('Logged Out') || errorMessage.includes('401')) {
      logger.error('WhatsApp session logged out. Please re-authenticate.');
      return { shouldReconnect: false, fatal: true };
    }

    if (errorMessage.includes('Rate limit')) {
      logger.warn('WhatsApp rate limit hit. Backing off...');
      return { shouldReconnect: false, fatal: false };
    }

    logger.error('Unknown WhatsApp error', { error: errorMessage });
    return { shouldReconnect: true, fatal: false };
  }

  /**
     * Format error for user-friendly message
     */
  formatUserError(error) {
    if (error instanceof ValidationError) {
      return `❌ Invalid input: ${error.message}`;
    }

    if (error instanceof PermissionError) {
      return `🔒 ${error.message}`;
    }

    if (error instanceof RateLimitError) {
      return '⏳ Please slow down. Try again in a moment.';
    }

    if (error instanceof NotFoundError) {
      return `❌ ${error.message}`;
    }

    if (error instanceof ExternalServiceError) {
      return '⚠️ External service error. Please try again later.';
    }

    // Generic error message for unknown errors
    return '❌ Something went wrong. Please try again.';
  }
}

/**
 * Async error wrapper for functions
 */
export function asyncHandler(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw error;
    }
  };
}

/**
 * Retry logic for operations
 */
export async function retryOperation(operation, maxRetries = 3, delay = 1000, logger) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      if (logger) {
        logger.warn(`Operation failed (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`, {
          error: error.message,
        });
      }

      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
}

export default ErrorHandler;
