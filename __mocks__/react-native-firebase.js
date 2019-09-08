export default {
  messaging: jest.fn(() => ({
    hasPermission: jest.fn(() => Promise.resolve(true)),
    subscribeToTopic: jest.fn(),
    unsubscribeFromTopic: jest.fn(),
    requestPermission: jest.fn(() => Promise.resolve(true)),
    getToken: jest.fn(() => Promise.resolve('myMockToken')),
  })),
  notifications: jest.fn(() => ({
    onNotification: jest.fn(),
    onNotificationDisplayed: jest.fn(),
  })),
  analytics: jest.fn(() => ({
    logEvent: jest.fn(),
    setCurrentScreen: jest.fn(),
    setAnalyticsCollectionEnabled: jest.fn(),
  })),
  config: jest.fn(() => ({
    setDefaults: jest.fn(),
    fetch: jest.fn(),
    activateFetched: jest.fn(),
    getValue: jest.fn(),
  })),
};
