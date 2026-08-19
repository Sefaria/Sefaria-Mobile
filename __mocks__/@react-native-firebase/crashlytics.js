// Same as the analytics mock: the app calls the modular form, `log(getCrashlytics(), msg)`.
export const getCrashlytics = jest.fn(() => ({}));
export const log = jest.fn();
export const recordError = jest.fn();
export const setAttribute = jest.fn();

export default () => ({
    log: jest.fn(x => console.log(x)),
    recordError: jest.fn(x => console.error(x)),
    error: jest.fn(x => console.error(x)),
})
