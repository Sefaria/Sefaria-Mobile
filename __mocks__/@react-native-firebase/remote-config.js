export default () => ({
  setDefaults: jest.fn(),
  fetch: jest.fn(async () => {}),
  activate: jest.fn(),
  getValue: jest.fn(() => ({
    asString: jest.fn(() => '')
  })),
})
