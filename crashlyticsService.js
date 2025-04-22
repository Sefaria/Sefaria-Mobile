// src/services/analytics/crashlyticsService.js
import crashlytics from '@react-native-firebase/crashlytics';

// TODO add check if there is offline data and what version it is (DownloadControl.lastUpdated())

/**
 * CrashlyticsService
 * 
 * A service for handling error reporting to Firebase Crashlytics.
 * Provides methods to record errors with additional context attributes.
 */
const CrashlyticsService = {
  /**
   * Records an error to Firebase Crashlytics with optional context attributes.
   * 
   * @param {Error|string} error - The error to record. Can be an Error object (to log the stack) or error message string.
   * @param {Object} attributes - Key-value pairs of additional context to attach to the error.
   * @param {boolean} consoleLog - Whether to also log the error to console (default: false).
   */
  recordError: (error, attributes = {}, consoleLog = false) => {
    // Accept an actual Error object or create one
    const errorToRecord = error instanceof Error ? error : new Error(error);
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        crashlytics().setAttribute(key, String(value));
      }
    });
    
    // Optionally log to console
    if (consoleLog) {
      console.error('Crashlytics Error:', errorToRecord, attributes);
    }
    
    // Record the error
    crashlytics().recordError(errorToRecord);
  }
};

export default CrashlyticsService;