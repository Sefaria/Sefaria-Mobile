jest.mock('react-native-version-number', () => ({ appVersion: '6.8.4', buildVersion: '1' }));
// @sefaria/search 0.9.9 builds its own fetch headers and ignores the 4th
// constructor arg; 0.10.0 spreads it into the search-wrapper request. Until the
// dependency is bumped we can only assert that sefaria.js wires the header in.
jest.mock('@sefaria/search', () => {
  function Search(...args) { Search.constructedWith = args; }
  return { Search };
});

import Sefaria from '../sefaria';
import { USER_AGENT } from '../userAgent';
import { Search } from '@sefaria/search';

const EXPECTED_UA = 'Sefaria/mobile-ios (6.8.4)';

const okResponse = (body = {}) => Promise.resolve({
  ok: true, status: 200, statusText: 'OK',
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(JSON.stringify(body)),
});

describe('User-Agent on Sefaria API requests', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() => okResponse({ hits: { hits: [] } }));
  });

  test('builds the Phase 0 convention string: Sefaria/<service> (<appVersion>)', () => {
    expect(USER_AGENT).toBe(EXPECTED_UA);
  });

  test('omits the version comment when the app version is unavailable', () => {
    jest.resetModules();
    jest.doMock('react-native-version-number', () => ({ appVersion: undefined, buildVersion: undefined }));
    expect(require('../userAgent').USER_AGENT).toBe('Sefaria/mobile-ios');
  });

  test('api.js request funnel sends it, alongside auth when private', async () => {
    await Sefaria.api._request('Genesis 1', 'text', true, {}, true);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1].headers['User-Agent']).toBe(EXPECTED_UA);

    Sefaria._auth = { uid: 1, token: 'tok' };
    Sefaria.api.getAuthToken = jest.fn(() => Promise.resolve());
    await Sefaria.api._request('Genesis 1', 'text', true, {}, true, true);
    const privateHeaders = fetch.mock.calls[1][1].headers;
    expect(privateHeaders['User-Agent']).toBe(EXPECTED_UA);
    expect(privateHeaders.Authorization).toBe('Bearer tok');
  });

  test('auth calls that bypass the funnel send it', async () => {
    Sefaria.api.login({ email: 'a@b.c', password: 'x' });
    Sefaria.api.register({ email: 'a@b.c', password: 'x' });
    Sefaria.api.refreshToken('refresh');
    Sefaria.api.requestPasswordResetRequest('a@b.c');
    Sefaria.api.socialLoginRequest('google', 'idtoken', {});
    expect(fetch).toHaveBeenCalledTimes(5);
    for (const [url, opts] of fetch.mock.calls) {
      expect(url).toMatch(/^https:\/\/www\.sefaria\.org\//);
      expect(opts.headers['User-Agent']).toBe(EXPECTED_UA);
      expect(opts.headers['Content-Type']).toBeDefined();
    }
  });

  test('search client is constructed with it (sent by @sefaria/search >= 0.10.0)', () => {
    expect(Search.constructedWith).toEqual(['https://www.sefaria.org', 'text', 'sheet', { 'User-Agent': EXPECTED_UA }]);
  });
});
