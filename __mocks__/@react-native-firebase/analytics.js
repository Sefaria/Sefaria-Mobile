// The app uses the modular Firebase API — `logEvent(getAnalytics(), ...)` — so the mock has
// to provide those named exports, not just a default. Without them every call site throws
// "getAnalytics is not a function" the moment a screen logs an event.
export const getAnalytics = jest.fn(() => ({}));
export const logEvent = jest.fn();
export const setAnalyticsCollectionEnabled = jest.fn();
export const setDefaultEventParameters = jest.fn();

export default () => ({
  logEvent: jest.fn(),
  logScreenView: jest.fn(),
  setAnalyticsCollectionEnabled: jest.fn(),
})
