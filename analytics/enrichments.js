/**
 * Shared enrichment functions for analytics and error reporting
 */
import { getCurrentGlobalState } from '../StateManager';
import NetInfo from "@react-native-community/netinfo";
import { offlineTitleExists, loadTextIndexOffline } from '../offline';
import { lastUpdated } from '../DownloadControl';
import { devLog } from '../devUtils';
import Sefaria from '../sefaria';

// Track the NetInfo event listener for proper cleanup - used for is_online
let _netInfoUnsubscribe = null;

// Cached network state for analytics
let _cachedIsOnline = null;

/**
 * Main enrichment function that adds context data to analytics or error attributes
 * 
 * @param {Object} attributes - Attributes object to enrich
 * @returns {Promise<Object>} - Enriched attributes object
 */
export async function enrichAttributes(attributes = {}) {
  const enrichedAttributes = { ...attributes };
  
  // Add user state info
  await _enrichWithUserState(enrichedAttributes);
  
  // Add offline schema version
  await _enrichWithSchemaVersion(enrichedAttributes);
  
  // Add title info and offline info - if ref is present
  await _enrichWithTitleInfo(enrichedAttributes);
  
  return enrichedAttributes;
}

/**
 * Enriches attributes with user state information
 * 
 * @param {Object} attributes - The attributes object to enrich
 */
async function _enrichWithUserState(attributes) {
  const globalState = getCurrentGlobalState();

  attributes.logged_in = globalState.isLoggedIn;
  attributes.site_lang = globalState.interfaceLanguage;
  attributes.traffic_type = globalState.userEmail?.includes("sefaria.org") ? 'internal' : '';
  attributes.is_online = await getIsOnline();
}

/**
 * Enriches the attributes inplace with offline schema version information
 * 
 * @param {Object} attributes - The attributes object to enrich
 * @returns {Promise<void>}
 */
async function _enrichWithSchemaVersion(attributes) {
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
 * 
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
    const isTitleSavedOffline = await offlineTitleExists(ref);
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
  if (lastUpdateJSON?.schema_version) {
    return lastUpdateJSON.schema_version;
  }
  return null;
}

/**
 * Initializes the online status listener
 * 
 * Note: This is called internally by getIsOnline when needed
 * 
 * @private
 */
async function _initOnlineStatusListener() {
  if (!_netInfoUnsubscribe) {
    // Set up a listener to update cached network state
    _netInfoUnsubscribe = NetInfo.addEventListener(state => {
      _cachedIsOnline = state.isConnected === true && state.isInternetReachable !== false;
      devLog(`Network state changed: isOnline=${_cachedIsOnline}`);
    });

    // Initialize by fetching once
    const state = await NetInfo.fetch();
    _cachedIsOnline = state.isConnected === true && state.isInternetReachable !== false;
  }
};

/**
 * Gets the current online status, initializing the listener if needed
 * 
 * @returns {boolean} Whether the device is currently online
 */
export async function getIsOnline() {
  // Initialize listener if not already initialized
  await _initOnlineStatusListener();
  
  return _cachedIsOnline;
};