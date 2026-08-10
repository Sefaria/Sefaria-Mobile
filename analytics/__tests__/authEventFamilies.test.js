import { AUTH_EVENT_FAMILY, truncateForAnalytics, generateUUID } from '../authEventFamilies';
import { AUTH_MODE } from '../../AuthConstants';

// AuthPage builds every auth event name as `${AUTH_EVENT_FAMILY[authMode]}_...`.
// A mode with no family entry doesn't crash -- it produces `undefined_flow_started`
// and friends, which reach Firebase as real events and quietly poison the funnel.
// So the invariant worth protecting is total coverage of AUTH_MODE, not the
// specific two strings: adding a third mode without a family must fail here.
describe('AUTH_EVENT_FAMILY', () => {
  test.each(Object.values(AUTH_MODE))('every AUTH_MODE has a usable family (%s)', (mode) => {
    const family = AUTH_EVENT_FAMILY[mode];
    expect(typeof family).toBe('string');
    expect(family.length).toBeGreaterThan(0);
  });

  test('has no family entries for modes that are not in AUTH_MODE', () => {
    expect(Object.keys(AUTH_EVENT_FAMILY).sort()).toEqual(Object.values(AUTH_MODE).sort());
  });

  test('gives each mode a distinct family so the two funnels stay separable', () => {
    const families = Object.values(AUTH_MODE).map((mode) => AUTH_EVENT_FAMILY[mode]);
    expect(new Set(families).size).toBe(families.length);
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
