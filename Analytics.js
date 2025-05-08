import { getCurrentGlobalState } from './StateManager';
import analytics from "@react-native-firebase/analytics";
import { isProd } from './env';
import NetInfo from "@react-native-community/netinfo";


/**
 * Initializes analytics collection
 */
const initAnalytics = () => {
  analytics().setAnalyticsCollectionEnabled(true);

  // Set up NetInfo listener if not already set up
  _initOnlineStatusListener();

  if (!isProd) {
    console.log(`Analytics initialized`);
  }
};

/**
 * Logs a screen view in Firebase Analytics
 *
 * @param {string} screen_name - The name of the screen
 * @param {string} screen_class - The class of the screen
 */
const trackCurrentScreen = (screen_name, screen_class) => {
  analytics().logScreenView({ screen_class, screen_name });
  if (!isProd) {
    console.log(`Analytics Screen Set: ${screen_name}; Screen class: ${screen_class}`);
  }
};

/**
 * Tracks an analytics event via Firebase Analytics, enriching it with selected parameters.
*
* @param {string} eventName - The name of the event to log.
* @param {Object} [eventParams={}] - Optional additional parameters for the event.
*/
const trackEvent = (eventName, eventParams = {}) => {
  const augmentedParams = _enrichAnalyticsFromState(eventParams);

  analytics().logEvent(eventName, augmentedParams);
  if (!isProd) {
    console.log(`Analytics Event Tracked: ${eventName}`, augmentedParams);
  }
};

/**
 * Tracks a pageview event with custom dimensions and metrics
 *
 * @param {string} pageType - The type of page being viewed
 * @param {Object} customDimensions - Custom dimensions to include with the pageview
 * @param {Object} contentGroups - Content grouping information
 */
const trackPageview = (pageType, customDimensions, contentGroups) => {
  // TODO: This seems to fire every time a new ref comes in or out of view and doesn't seem to give super rich data is this by design?
  // This was origianlly commented out in 2023 Dec (#4448f03) before the refactor to Analytics, so it would be best to get to this.

  // This implementation was not tested since the refactor, it was refactored and commented out.
  // const eventParams = {
  //   page_type: pageType,
  //   ...customDimensions
  // };

  // // Add content groups if provided
  // if (contentGroups) {
  //   for (const [key, value] of Object.entries(contentGroups)) {
  //     if (value) {
  //       eventParams[`content_group${key}`] = value;
  //     }
  //   }
  // }

  // analytics().logEvent("page_view", eventParams);
  // if (!isProd) {
  //   console.log(`Analytics Page View Tracked: ${pageType}`, eventParams);
  // }
};

export { trackEvent, initAnalytics, trackCurrentScreen, trackPageview };

/**
 * Enriches analytics event parameters with user and app state information.
 *
 * @param {Object} eventParams - The original analytics event parameters.
 * @returns {Object} A new parameters object including aditional parameters taken from the app's state
 */
function _enrichAnalyticsFromState(eventParams) {
  const globalState = getCurrentGlobalState();

  const isLoggedIn = globalState.isLoggedIn;
  const interfaceLanguage = globalState.interfaceLanguage;
  const trafficType = globalState.userEmail?.includes("sefaria.org") ? 'internal' : '';
  const isOnline = _getIsOnline();

  const augmentedParams = {
    ...eventParams,
    logged_in: isLoggedIn,
    site_lang: interfaceLanguage,
    traffic_type: trafficType,
    is_online: isOnline,

  };
  return augmentedParams;
};

// # Tracking the online status

// Track the NetInfo event listener for proper cleanup - used for is_online
let _netInfoUnsubscribe = null;

// Cached network state for analytics
let _cachedIsOnline = null;

/**
 * Initializes the online status listener
 */
function _initOnlineStatusListener() {
  if (!_netInfoUnsubscribe) {
    // Set up a listener to update cached network state
    _netInfoUnsubscribe = NetInfo.addEventListener(state => {
      _cachedIsOnline = state.isConnected === true && state.isInternetReachable !== false;
      if (!isProd) {
        console.log(`Network state changed: isOnline=${_cachedIsOnline}`);
      }
    });

    // Initialize by fetching once
    NetInfo.fetch().then(state => {
      _cachedIsOnline = state.isConnected === true && state.isInternetReachable !== false;
    });
  }
};

/**
 * Helper function to get the current online status
 * @returns {boolean} Whether the device is currently online
 */
function _getIsOnline() {
  return _cachedIsOnline;
};