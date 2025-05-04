// src/services/analytics/crashlyticsService.js
import crashlytics from '@react-native-firebase/crashlytics';
import { hasOfflineTitle, getOfflineTitleIndex } from './offline';
import { lastUpdated } from './DownloadControl';

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
   * @param {Error|string} error - The error to record. Can be an Error object (to log the stack) or error message string.
   * @param {Object} attributes - Key-value pairs of additional context to attach to the error. Will be offline info (schema version. If ref is present, will also include title, is title saved offline, simplified index)
   * @param {boolean} consoleLog - Whether to also log the error to console (default: false).
   * @returns {Promise<void>} A promise that resolves when the error has been recorded
   */
  recordError: async (error, attributes = {}, consoleLog = false) => {
    // Accept an actual Error object or create one
    const errorToRecord = error instanceof Error ? error : new Error(error);
    
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
 * Enriches the attributes object (in-place) with offline‑title info
 * @param {{ ref?: string, [key: string]: any }} attributes
 * @returns {Promise<void>}
 */
async function _enrichAttributes(attributes) {
  // 1. Pull in the latest offline-update JSON
  await _enrichWithSchemaVersion(attributes);

  // 2. Enrich with info about offline title
  if (attributes.ref) {
    await _enrichWithTitleInfo(attributes);
  }
}

/**
 * Enriches the attributes inplace with offline schema version information
 * @param {Object} attributes - The attributes object to enrich
 * @returns {Promise<void>}
 */
async function _enrichWithSchemaVersion(attributes) {
  // Note: Update recordError JSdoc to changes here.
  try {
    const offlineDataSchemaVersion = await _getOfflineSchemaVersion();
    if (offlineDataSchemaVersion) {
      attributes.offlineDataSchemaVersion = offlineDataSchemaVersion;
    } else {
      attributes.offlineDataSchemaVersion = "Couldn't find schema, offline library likely never downloaded";
    }
  } catch (e) {
    console.error('Failed to retrieve offline schema version:', e);
    attributes.offlineDataSchemaVersion = `Error while loading offlineDataSchemaVersion. Message: ${e}`;
  }
}

/**
 * Enriches the attributes inplace with offline title information when a ref is present
 * @param {Object} attributes - The attributes object containing a ref property
 * @returns {Promise<void>}
 */
async function _enrichWithTitleInfo(attributes) {
  try {
    const {ref} = attributes;
    if (!ref) return;

    // Get the book title if it exists
    const bookTitle = Sefaria.textTitleForRef(ref);
    if (bookTitle) {
      attributes.bookTitle = bookTitle;
    }

    // Check if the title is saved offline
    const isTitleSavedOffline = await hasOfflineTitle(ref);
    attributes.isTitleSavedOffline = String(isTitleSavedOffline);

    // If title is available offline, get its structure
    if (isTitleSavedOffline) {
      const offlineIndex = await getOfflineTitleIndex(ref);
      if (offlineIndex) {
        const simplifiedOfflineIndex = _simplifyIndex(offlineIndex)
        attributes.simplifiedOfflineIndex = JSON.stringify(simplifiedOfflineIndex);
      }
    }
  } catch (enrichmentError) {
    console.error('Failed to enrich error with offline title data:', enrichmentError);
  }
}

/**
 * Default set of keys to strip out of an index schema
 * @constant {Set<string>}
 */
const defaultKeysToRemoveFromIndex = new Set([
  'content_counts',
  'match_templates',
  'titles',
  'title',
  'heTitle',
  'heSectionNames',
]);
/**
   * Removes specified fields from a schema object by creating a clean copy.
   * @param {Object} schema - The schema object to clean
   * @param {Set<string>} [removeKeys=defaultKeysToRemoveFromIndex] - Set of keys to remove
   * @returns {Object} A new schema object with specified fields removed
 */
function _simplifyIndex(schema, removeKeys = defaultKeysToRemoveFromIndex){
    // Utilising a built in function of JSON.stringify to do the deep removal of keys
    return JSON.parse(
        JSON.stringify(schema, (key, value) => removeKeys.has(key) ? undefined : value
        )
    );
};

/**
 * Retrieve the version of the offline schema
 * @returns {Promise<string|null>} the version number. Returns null if not found.
 */
async function _getOfflineSchemaVersion() {
    const lastUpdateJSON = await lastUpdated();
    
  // Check if lastUpdateJSON is empty or doesn't have schema_version
  if (!lastUpdateJSON || Object.keys(lastUpdateJSON).length === 0 || !lastUpdateJSON.schema_version) {
      return null;
    }
    
    return lastUpdateJSON.schema_version;
  }

export default CrashlyticsService;
