// Shake-to-report-a-bug listens on a native event emitter that Jest has no binding for.
// ReaderApp subscribes at import time, so without this stub the module never loads.
export default {
  addListener: jest.fn(() => ({ remove: jest.fn() })),
};
