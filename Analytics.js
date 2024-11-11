import { getCurrentGlobalState } from './StateManager';
import Sefaria from './sefaria';

const trackEvent = (eventName, eventParams = {}) => {
  const globalState = getCurrentGlobalState();

  const isLoggedIn = globalState.isLoggedIn;
  
  const usesOfflinePackages = globalState.offlinePackages && globalState.offlinePackages.length > 0;

  const augmentedParams = {
    ...eventParams,
    is_logged_in: isLoggedIn,
    user_uses_offline_packages: usesOfflinePackages,
  };

  Sefaria.track.event(eventName, augmentedParams);
  console.log(`Event Tracked: ${eventName}`, augmentedParams);
};

export { trackEvent };
