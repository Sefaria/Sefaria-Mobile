// analytics/events.js uses the modular v9+ Firebase Analytics API
// (`getAnalytics()` + free functions like `logEvent(analytics, ...)`), not
// the legacy namespaced `analytics().logEvent(...)` API this mock originally
// only covered. Without these named exports, `getAnalytics` etc. import as
// `undefined` and every trackEvent(...) call throws a "getAnalytics is not a
// function" TypeError inside an unawaited promise chain -- which surfaces in
// tests as a crash well after the triggering test has finished (or as an
// unhandled rejection that kills the whole worker), not as a clean failure
// on the line that caused it.
export const getAnalytics = jest.fn(() => ({}));
export const logEvent = jest.fn();
export const logScreenView = jest.fn();
export const setAnalyticsCollectionEnabled = jest.fn();
export const setDefaultEventParameters = jest.fn();

export default () => ({
  logEvent: jest.fn(),
  logScreenView: jest.fn(),
  setAnalyticsCollectionEnabled: jest.fn(),
})
