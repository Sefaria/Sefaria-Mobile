// src/services/analytics/crashlyticsService.js
import crashlytics from '@react-native-firebase/crashlytics';
import { hasOfflineTitle, loadTextIndexOffline } from './offline';
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
   * @param {Error} error - The Error object to record. Must be an Error object to capture the stack trace.
   * @param {Object} attributes - Key-value pairs of additional context to attach to the error. Will be offline info (schema version. If ref is present, will also include title, is title saved offline, simplified index)
   * @param {boolean} consoleLog - Whether to also log the error to console (default: false).
   * @returns {Promise<void>} A promise that resolves when the error has been recorded
   */
  recordError: async (error, attributes = {}, consoleLog = false) => {
    if (!(error instanceof Error)) {
      throw new Error('recordError must be called with an Error object');
    }
    
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
  await _enrichWithTitleInfo(attributes);
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
    const { ref } = attributes;
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
      const offlineIndex = await loadTextIndexOffline(ref);
      if (offlineIndex?.schema) {
        const simplifiedOfflineIndex = _simplifyIndex(offlineIndex.schema)
        attributes.simplifiedOfflineIndex = JSON.stringify(simplifiedOfflineIndex);
      }
    }
  } catch (enrichmentError) {
    console.error('Failed to enrich error with offline title data:', enrichmentError);
  }
}

/**
 * Default set of keys to leave in an index schema
 * @constant {Set<string>}
 */
const defaultKeysToLeaveInIndex = new Set([
  "addressTypes",
  "depth",
  "key",
  "lengths",
  "nodeType",
  "nodes",
  "sectionNames"
]);

/**
 * Simplifies an index object by recursively filtering it to keep only whitelisted keys.
 * If a key is not whitelisted, its entire value (including nested children) is removed.
 * Keys whose entire sub-tree is filtered out (or is null/undefined) are not included in the returned object.
 * This function expects an object as the top-level input.
 *
 * @param {Object} schema - The index object to simplify.
 * @param {Set<string>} [leaveKeys=defaultKeysToLeaveInIndex] - Set of keys to retain.
 * @returns {Object} A new, simplified object containing only the whitelisted keys and their recursively filtered values.
 */
function _simplifyIndex(schema, leaveKeys = defaultKeysToLeaveInIndex) {
  // Handle non-object types encountered during recursion (or if initial input is not an object)
  if (schema === null || typeof schema !== 'object') {
    return schema;
  }

  // Handle arrays encountered during recursion
  if (Array.isArray(schema)) {
    return schema.map(item => _simplifyIndex(item, leaveKeys))
      .filter(item => item !== null && item !== undefined); // Remove null/undefined results. prevents adding keys whose entire sub-tree was filtered out
  }

  // Handle objects (the primary expected type)
  const filteredObj = {};
  for (const key in schema) {
    if (leaveKeys.has(key)) {
      const filteredValue = _simplifyIndex(schema[key], leaveKeys);
      // Keep the key if its filtered value is not null or undefined
      // This prevents adding keys whose entire sub-tree was filtered out
      if (filteredValue !== null && filteredValue !== undefined) {
        filteredObj[key] = filteredValue;
      }
    }
  }
  return filteredObj;
}

/**
 * Retrieve the version of the offline schema
 * @returns {Promise<string|null>} the version number. Returns null if not found.
 */
async function _getOfflineSchemaVersion() {
  const lastUpdateJSON = await lastUpdated();

  // Check if lastUpdateJSON is empty or doesn't have schema_version
  if (!lastUpdateJSON || !Object.keys(lastUpdateJSON).length || !lastUpdateJSON.schema_version) {
    return null;
  }

  return lastUpdateJSON.schema_version;
}

export default CrashlyticsService;
