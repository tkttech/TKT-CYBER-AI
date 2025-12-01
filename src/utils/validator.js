import Joi from 'joi';
import { ValidationError } from './errorHandler.js';

/**
 * Validation utilities for bot inputs
 */

/**
 * Validate WhatsApp phone number format
 */
export function validatePhoneNumber(number) {
  const schema = Joi.string().pattern(/^[0-9]{10,15}@s\.whatsapp\.net$/);
  const { error } = schema.validate(number);

  if (error) {
    throw new ValidationError('Invalid WhatsApp phone number format');
  }

  return true;
}

/**
 * Validate message text
 */
export function validateMessageText(text, maxLength = 10000) {
  const schema = Joi.string().max(maxLength).required();
  const { error } = schema.validate(text);

  if (error) {
    throw new ValidationError(`Message must be a string with max length ${maxLength}`);
  }

  return true;
}

/**
 * Validate command arguments
 */
export function validateArgs(args, schema) {
  const { error, value } = schema.validate(args, { abortEarly: false });

  if (error) {
    const messages = error.details.map(detail => detail.message).join(', ');
    throw new ValidationError(messages);
  }

  return value;
}

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }

  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .trim();
}

/**
 * Validate URL
 */
export function validateUrl(url) {
  const schema = Joi.string().uri();
  const { error } = schema.validate(url);

  if (error) {
    throw new ValidationError('Invalid URL format');
  }

  return true;
}

/**
 * Validate file type
 */
export function validateFileType(mimeType, allowedTypes = ['image', 'video', 'audio', 'document']) {
  const typeCategory = mimeType.split('/')[0];

  if (!allowedTypes.includes(typeCategory)) {
    throw new ValidationError(`File type ${typeCategory} not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }

  return true;
}

/**
 * Validate and parse JSON
 */
export function validateJSON(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new ValidationError('Invalid JSON format');
  }
}

/**
 * Create validator function from Joi schema
 */
export function createValidator(schema) {
  return (data) => {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const messages = error.details.map(detail => detail.message).join(', ');
      throw new ValidationError(messages);
    }

    return value;
  };
}

export default {
  validatePhoneNumber,
  validateMessageText,
  validateArgs,
  sanitizeInput,
  validateUrl,
  validateFileType,
  validateJSON,
  createValidator,
};
