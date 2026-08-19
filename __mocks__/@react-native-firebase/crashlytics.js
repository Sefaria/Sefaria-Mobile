// The real module (`@react-native-firebase/crashlytics`) is a "modular" v9-style
// API: `getCrashlytics()` returns an instance, and the other functions
// (recordError, log, setAttribute) take that instance as their first argument
// -- see auth.js/DownloadControl.js/analytics/crashlytics.js for the call shape.
// Named exports are what those callers actually import; the default export
// below is kept only because it predates this and nothing has confirmed it's
// unused elsewhere.
const crashlyticsInstance = {};

export const getCrashlytics = jest.fn(() => crashlyticsInstance);
export const log = jest.fn((instance, x) => console.log(x));
export const recordError = jest.fn((instance, x) => console.error(x));
export const setAttribute = jest.fn();
export const error = jest.fn(x => console.error(x));

export default () => ({
    log: jest.fn(x => console.log(x)),
    recordError: jest.fn(x => console.error(x)),
    error: jest.fn(x => console.error(x)),
})
