// Debug utility - Only logs in development
const DEBUG = import.meta.env.DEV || import.meta.env.MODE === 'development';

export const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args);
  }
};

export const debugError = (...args: any[]) => {
  if (DEBUG) {
    console.error(...args);
  }
};

export const debugWarn = (...args: any[]) => {
  if (DEBUG) {
    console.warn(...args);
  }
};

