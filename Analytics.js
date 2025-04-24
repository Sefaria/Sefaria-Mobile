import { getCurrentGlobalState } from './StateManager';
import analytics from "@react-native-firebase/analytics";
import { isProd } from './env';

/**
 * Tracks an analytics event via Firebase Analytics, enriching it with selected parameters.
 *
 * @param {string} eventName - The name of the event to log.
 * @param {Object} [eventParams={}] - Optional additional parameters for the event.
 */
const trackEvent = (eventName, eventParams = {}) => {
  const augmentedParams = enrichAnalyticsFromState(eventParams);

  analytics().logEvent(eventName, augmentedParams);
  if (!isProd) {
    console.log(`Analytics Event Tracked: ${eventName}`, augmentedParams);
  }
};

export { trackEvent };

/**
 * Enriches analytics event parameters with user and app state information.
 *
 * @param {Object} eventParams - The original analytics event parameters.
 * @returns {Object} A new parameters object including aditional parameters taken from the app's state
 */
function enrichAnalyticsFromState(eventParams) {
  const globalState = getCurrentGlobalState();

  const isLoggedIn = globalState.isLoggedIn;
  // TODO: Double check this, I can't find offlinePackages anywhere in the code
  const usesOfflinePackages = globalState.offlinePackages && globalState.offlinePackages.length > 0;

  const augmentedParams = {
    ...eventParams,
    is_logged_in: isLoggedIn,
    user_uses_offline_packages: usesOfflinePackages,
  };
  return augmentedParams;
};
