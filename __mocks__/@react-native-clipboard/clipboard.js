// Clipboard is a native module; stubbed so TextSegment (and everything above it) can load.
export default {
  setString: jest.fn(),
  getString: jest.fn(() => Promise.resolve('')),
};
