import '../sefaria';
import { ANALYTICS_REASON, SSO_ERROR_CODE, AUTH_ERROR_CODE } from '../AuthConstants';

// Unit coverage for auth.js's requestPasswordReset, following the same
// fetch-mocking pattern socialLoginServerError.test.js uses for socialLogin --
// these two methods share the same classify-don't-throw shape.
describe('requestPasswordReset', () => {
  let originalFetch;
  const url = () => `${Sefaria.api._baseHost}api/auth/password/reset`;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const mockResponse = ({ ok, status, body, responseUrl = url() }) => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok,
      status,
      url: responseUrl,
      text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
    }));
  };

  test('a 200 {} response is a plain success', async () => {
    mockResponse({ ok: true, status: 200, body: {} });
    const result = await Sefaria.api.requestPasswordReset('bob@sefaria.org');

    expect(result).toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledWith(url(), expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'bob@sefaria.org' }),
    }));
  });

  test('a 200 with no body at all is still a success (no JSON to parse)', async () => {
    mockResponse({ ok: true, status: 200, body: undefined });
    const result = await Sefaria.api.requestPasswordReset('bob@sefaria.org');
    expect(result).toEqual({ success: true });
  });

  test('400 auth.invalid_email is reported as a scalar code, not a thrown error', async () => {
    mockResponse({ ok: false, status: 400, body: { error: 'auth.invalid_email' } });
    const result = await Sefaria.api.requestPasswordReset('not-an-email');

    expect(result.success).toBe(false);
    expect(result.code).toBe('auth.invalid_email');
    expect(result.analyticsError).toBe(ANALYTICS_REASON.SERVER_REJECTED);
  });

  describe('401 sso_only_account', () => {
    test('google-only providers list is passed through', async () => {
      mockResponse({
        ok: false,
        status: 401,
        body: { error: 'auth.generic_error', _auth: { code: 'sso_only_account', providers: ['google'] } },
      });
      const result = await Sefaria.api.requestPasswordReset('bob@sefaria.org');

      expect(result.success).toBe(false);
      expect(result.code).toBe(AUTH_ERROR_CODE.SSO_ONLY_ACCOUNT);
      expect(result.providers).toEqual(['google']);
    });

    test('apple-only providers list is passed through', async () => {
      mockResponse({
        ok: false,
        status: 401,
        body: { error: 'auth.generic_error', _auth: { code: 'sso_only_account', providers: ['apple'] } },
      });
      const result = await Sefaria.api.requestPasswordReset('bob@sefaria.org');

      expect(result.code).toBe(AUTH_ERROR_CODE.SSO_ONLY_ACCOUNT);
      expect(result.providers).toEqual(['apple']);
    });

    test('an account linked to both providers is passed through, regardless of order', async () => {
      mockResponse({
        ok: false,
        status: 401,
        body: { error: 'auth.generic_error', _auth: { code: 'sso_only_account', providers: ['apple', 'google'] } },
      });
      const result = await Sefaria.api.requestPasswordReset('bob@sefaria.org');

      expect(result.code).toBe(AUTH_ERROR_CODE.SSO_ONLY_ACCOUNT);
      expect(result.providers).toEqual(['apple', 'google']);
    });

    test('an empty providers list is preserved as an empty array, not dropped', async () => {
      mockResponse({
        ok: false,
        status: 401,
        body: { error: 'auth.generic_error', _auth: { code: 'sso_only_account', providers: [] } },
      });
      const result = await Sefaria.api.requestPasswordReset('bob@sefaria.org');

      expect(result.code).toBe(AUTH_ERROR_CODE.SSO_ONLY_ACCOUNT);
      expect(result.providers).toEqual([]);
    });

    test('a missing providers key defaults to an empty array rather than undefined', async () => {
      mockResponse({
        ok: false,
        status: 401,
        body: { error: 'auth.generic_error', _auth: { code: 'sso_only_account' } },
      });
      const result = await Sefaria.api.requestPasswordReset('bob@sefaria.org');

      expect(result.code).toBe(AUTH_ERROR_CODE.SSO_ONLY_ACCOUNT);
      expect(result.providers).toEqual([]);
    });
  });

  test('a response with no _auth key at all is not misread as sso_only_account', async () => {
    mockResponse({ ok: false, status: 400, body: { error: 'auth.invalid_email' } });
    const result = await Sefaria.api.requestPasswordReset('not-an-email');
    expect(result.code).not.toBe(AUTH_ERROR_CODE.SSO_ONLY_ACCOUNT);
    expect(result.providers).toBeUndefined();
  });

  test('a network failure is classified as network_error, not server-rejected', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('Failed to fetch')));
    const result = await Sefaria.api.requestPasswordReset('bob@sefaria.org');

    expect(result.success).toBe(false);
    expect(result.code).toBe(SSO_ERROR_CODE.NETWORK_ERROR);
    expect(result.analyticsError).toBe(ANALYTICS_REASON.NETWORK_ERROR);
  });

  test('a redirected response is classified as redirected, not passed through as success', async () => {
    mockResponse({ ok: true, status: 200, body: {}, responseUrl: `${Sefaria.api._baseHost}accounts/login/` });
    const result = await Sefaria.api.requestPasswordReset('bob@sefaria.org');

    expect(result.success).toBe(false);
    expect(result.code).toBe(SSO_ERROR_CODE.REDIRECTED);
  });

  test('a non-JSON error body is classified as invalid_response, not thrown', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      status: 502,
      url: url(),
      text: () => Promise.resolve('<html>Bad Gateway</html>'),
    }));
    const result = await Sefaria.api.requestPasswordReset('bob@sefaria.org');

    expect(result.success).toBe(false);
    expect(result.code).toBe(SSO_ERROR_CODE.INVALID_RESPONSE);
  });

  test('a body-stream failure mid-read is classified as network_error, not thrown', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      status: 200,
      url: url(),
      text: () => Promise.reject(new Error('stream closed')),
    }));
    const result = await Sefaria.api.requestPasswordReset('bob@sefaria.org');

    expect(result.success).toBe(false);
    expect(result.code).toBe(SSO_ERROR_CODE.NETWORK_ERROR);
    expect(result.analyticsError).toBe(ANALYTICS_REASON.NETWORK_ERROR);
  });

  test('a non-scalar data.error does not become "[object Object]" as code', async () => {
    mockResponse({ ok: false, status: 400, body: { error: { email: ['bad'] } } });
    const result = await Sefaria.api.requestPasswordReset('bob@sefaria.org');

    expect(result.code).not.toBe('[object Object]');
    expect(result.code).toBe(SSO_ERROR_CODE.INVALID_RESPONSE);
  });
});
