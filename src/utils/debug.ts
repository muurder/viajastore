// Debug utility - Only logs in development
// Note: This file is deprecated in favor of logger.ts
// Keeping for backward compatibility but using logger internally
import { logger } from './logger';

export const debugLog = (...args: any[]) => {
  logger.log(...args);
};

export const debugError = (...args: any[]) => {
  logger.error(...args);
};

export const debugWarn = (...args: any[]) => {
  logger.warn(...args);
};

