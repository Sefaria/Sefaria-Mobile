import crashlytics from '@react-native-firebase/crashlytics';
import { enrichAttributes } from './enrichments';
import { devError } from '../devUtils';

/**
 * CrashlyticsService
 * 
 * A service for handling error reporting to Firebase Crashlytics.
 * Provides methods to record errors with additional context attributes.
 */
const CrashlyticsService = {
  /**
   * Records an error to Firebase Crashlytics with optional context attributes.
   * The function enriches data where relevant:
   * - If you have a ref it will check if the title is downloaded and return a striped version of the downloaded index
   * 
   * @param {Error} error - The Error object to record. Must be an Error object to capture the stack trace.
   * @param {Object} attributes - Key-value pairs of additional context to attach to the error.
   * @returns {Promise<void>} A promise that resolves when the error has been recorded
   */
  recordError: async (error, attributes = {}) => {
    if (!(error instanceof Error)) {
      throw new Error('recordError must be called with an Error object');
    }
    
    // Enrich attributes with state and context information
    const enrichedAttributes = await enrichAttributes(attributes);
    
    // Set attributes
    Object.entries(enrichedAttributes).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        crashlytics().setAttribute(key, String(value));
      }
    });
    
    // Log to console in non-production environment
    devError('Crashlytics Error:', error, enrichedAttributes);

    // Record the error
    return crashlytics().recordError(error);
  }
};

export default CrashlyticsService;
