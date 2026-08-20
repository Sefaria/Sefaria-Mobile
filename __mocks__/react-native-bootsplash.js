// `react-native-bootsplash` talks to a native module (RNBootSplash) that does not exist under
// Jest, so importing it throws before any test runs — which took out every suite that reaches
// ReaderApp.js. The splash screen has nothing to do with what these tests check, so stub it.
export default {
  hide: jest.fn(() => Promise.resolve()),
  isVisible: jest.fn(() => Promise.resolve(false)),
  useHideAnimation: jest.fn(),
};
