// src/services/analytics/crashlyticsService.js
import crashlytics from '@react-native-firebase/crashlytics';
import { hasOfflineBook, getOfflineBookIndex, undefined } from './offline';

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
   * The function enriches data where relevant:
   * - If you have a ref it will check if the book is downloaded and return a striped version of the downloaded index
   * 
   * @param {Error|string} error - The error to record. Can be an Error object (to log the stack) or error message string.
   * @param {Object} attributes - Key-value pairs of additional context to attach to the error.
   * @param {boolean} consoleLog - Whether to also log the error to console (default: false).
   * @returns {Promise<void>} A promise that resolves when the error has been recorded
   */
  recordError: async (error, attributes = {}, consoleLog = false) => {
    // Accept an actual Error object or create one
    const errorToRecord = error instanceof Error ? error : new Error(error);
    
    // Enrich with offline book information if a ref is provided
    await _enrichAttributes(attributes);
    
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
    return crashlytics().recordError(errorToRecord);
  }
};

/**
 * Enriches the attributes object (in-place) with offline‑book info
 * @param {{ ref?: string, [key: string]: any }} attributes
 * @returns {Promise<void>}
 */
async function _enrichAttributes(attributes) {
  if (attributes.ref) {
    try {
      const ref = attributes.ref;
      const isBookSavedOffline = await hasOfflineBook(ref);
      attributes.isBookSavedOffline = String(isBookSavedOffline);

      // If book is available offline, get its structure
      if (isBookSavedOffline) {
        const offlineIndex = await getOfflineBookIndex(ref);
        if (offlineIndex) {
          const simplifiedOfflineIndex = _simplifyIndex(offlineIndex)
          attributes.simplifiedOfflineIndex = JSON.stringify(simplifiedOfflineIndex);
        }
      }
    } catch (enrichmentError) {
      console.error('Failed to enrich error with offline book data:', enrichmentError);
    }
  }
};

/**
   * Removes specified fields from a schema object by creating a clean copy.
   * @param {Object} schema - The schema object to clean
   * @param {Set<string>} [removeKeys=new Set(['content_counts', 'match_templates', 'titles', 'title', 'heTitle', 'heSectionNames'])] - Set of keys to remove
   * @returns {Object} A new schema object with specified fields removed
 */
function _simplifyIndex(schema, removeKeys = new Set([
    'content_counts', 'match_templates', 'titles',
    'title', 'heTitle', 'heSectionNames'
    ])){
    // Use a replacer function with JSON.stringify
    return JSON.parse(
        JSON.stringify(schema, (key, value) => removeKeys.has(key) ? undefined : value
        )
    );
};

export default CrashlyticsService;
