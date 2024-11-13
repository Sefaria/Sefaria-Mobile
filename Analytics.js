import { getCurrentGlobalState } from './StateManager';
import analytics from "@react-native-firebase/analytics";

const trackEvent = (eventName, eventParams = {}) => {
  const globalState = getCurrentGlobalState();

  const isLoggedIn = globalState.isLoggedIn;
  
  const usesOfflinePackages = globalState.offlinePackages && globalState.offlinePackages.length > 0;

  const augmentedParams = {
    ...eventParams,
    is_logged_in: isLoggedIn,
    user_uses_offline_packages: usesOfflinePackages,
  };

  analytics().logEvent(eventName, augmentedParams);
  console.log(`Event Tracked: ${eventName}`, augmentedParams);
};

export { trackEvent };
