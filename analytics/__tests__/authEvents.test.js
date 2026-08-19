import { AUTH_EVENT, truncateForAnalytics, generateUUID } from '../authEvents';
import { AUTH_MODE, AUTH_FLOW_INTENT_BY_MODE } from '../../AuthConstants';

// The event names are the wire contract with the cross-platform analytics
// spec (must match web byte-for-byte), so pin the exact strings rather than
// just checking shape.
describe('AUTH_EVENT', () => {
  test('names match the cross-platform spec exactly', () => {
    expect(AUTH_EVENT).toEqual({
      FLOW_STARTED: 'auth_flow_started',
      METHOD_CHOSEN: 'auth_method_chosen',
      PROCESS_STARTED: 'auth_process_started',
      PROCESS_ENDED: 'auth_process_ended',
      FLOW_ENDED: 'auth_flow_ended',
    });
  });

  test('every event name is unique', () => {
    const names = Object.values(AUTH_EVENT);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('truncateForAnalytics', () => {
  test('returns undefined for null/undefined', () => {
    expect(truncateForAnalytics(null)).toBeUndefined();
    expect(truncateForAnalytics(undefined)).toBeUndefined();
  });
  test('leaves short strings unchanged', () => {
    expect(truncateForAnalytics('short message')).toBe('short message');
  });
  test('truncates to exactly 100 chars', () => {
    const longString = 'x'.repeat(150);
    const result = truncateForAnalytics(longString);
    expect(result.length).toBe(100);
    expect(result).toBe('x'.repeat(100));
  });
  test('leaves a value exactly 100 chars unchanged', () => {
    const exact = 'y'.repeat(100);
    expect(truncateForAnalytics(exact)).toBe(exact);
  });
  test('stringifies non-string input before truncating', () => {
    expect(truncateForAnalytics(404)).toBe('404');
  });
});

// Regression guard for the inline ternary this map replaced in AuthPage.js:
// a ternary silently maps any future AUTH_MODE member to LOGIN, while this
// fails loudly -- both by asserting every mode has an entry and by asserting
// the map carries no entries beyond AUTH_MODE's own members.
describe('AUTH_FLOW_INTENT_BY_MODE', () => {
  test('has a defined flow_intent for every AUTH_MODE, and no extra keys', () => {
    const modeValues = Object.values(AUTH_MODE).sort();
    expect(Object.keys(AUTH_FLOW_INTENT_BY_MODE).sort()).toEqual(modeValues);
  });

  test('every mapped flow_intent is defined', () => {
    Object.values(AUTH_MODE).forEach((mode) => {
      expect(AUTH_FLOW_INTENT_BY_MODE[mode]).toBeDefined();
    });
  });
});

describe('generateUUID', () => {
  test('matches RFC 4122 v4 UUID shape', () => {
    const uuid = generateUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  test('generates unique values across calls', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateUUID()));
    expect(ids.size).toBe(50);
  });
});
