import '../sefaria';
import { ANALYTICS_REASON, SSO_ERROR_CODE } from '../AuthConstants';

// Regression coverage for the code-review fix in auth.js's socialLogin: a
// non-ok response's `data.error` is server-controlled and Django form errors
// on a nested field arrive as an object (e.g. {"email": ["Already in use"]}),
// not a string. Adopting it as `code` verbatim used to make
// truncateForAnalytics's String(value) emit "[object Object]" into analytics,
// and the same value reached the user via AuthPage's ssoErrorWithCode.
describe('socialLogin non-ok response with a non-scalar data.error', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const mockRejectedResponse = (body) => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      status: 400,
      url: `${Sefaria.api._baseHost}api/auth/google/mobile`,
      text: () => Promise.resolve(JSON.stringify(body)),
    }));
  };

  test('a nested object data.error does not become "[object Object]" as code', async () => {
    mockRejectedResponse({ error: { email: ['Already in use'] } });
    const result = await Sefaria.api.socialLogin('google', 'id-token', {});

    expect(result.success).toBe(false);
    expect(result.code).not.toBe('[object Object]');
    expect(result.code).toBe(SSO_ERROR_CODE.INVALID_RESPONSE);
    expect(result.analyticsError).toBe(ANALYTICS_REASON.SERVER_REJECTED);
    // The raw detail must still be reachable for __DEV__ display.
    expect(result.error).toEqual({ error: { email: ['Already in use'] } });
  });

  test('a scalar data.error is still adopted as code, unchanged', async () => {
    mockRejectedResponse({ error: 'auth.social_signin_failed' });
    const result = await Sefaria.api.socialLogin('google', 'id-token', {});

    expect(result.code).toBe('auth.social_signin_failed');
    expect(result.analyticsError).toBe(ANALYTICS_REASON.SERVER_REJECTED);
  });
});
