import { ssoErrorWithCode } from '../AuthPage';
import strings from '../LocalizedStrings';
import { SSO_ERROR_CODE, APPLE_ERROR_CODE_UNKNOWN } from '../AuthConstants';

// Release builds used to append the raw code to the generic message (e.g.
// "Something went wrong. Try again. (network_error)"), which read to users as
// a leaked numeric/opaque SDK error. Product decision: login failures use
// actionable, human-readable messages instead of exposing a code. Network
// failures get their own actionable string; everything else collapses to the
// bare generic message, with no code, digits, or parentheses ever appended.
//
// '1000' (APPLE_ERROR_CODE_UNKNOWN) is asserted as a NETWORK case, not a
// generic-fallback case: it's the exact code from the reported bug
// ("יש תקלה, נסו שוב 1000"), which Apple's SDK sends through onSSOError when
// performRequest() fails with no more specific reason. Product's agreed copy
// for it is the network-error string (see AuthConstants.js / AuthPage.js's
// ssoErrorWithCode comments) -- this used to be pinned as a generic-fallback
// case, which is exactly the bug this file now guards against.
describe('ssoErrorWithCode', () => {
  test('the network error code shows the network-specific message', () => {
    expect(ssoErrorWithCode(SSO_ERROR_CODE.NETWORK_ERROR)).toBe(strings.errors.auth_network);
  });

  test("Apple's '1000' unknown-error code also shows the network-specific message", () => {
    expect(ssoErrorWithCode(APPLE_ERROR_CODE_UNKNOWN)).toBe(strings.errors.auth_network);
    expect(ssoErrorWithCode('1000')).toBe(strings.errors.auth_network);
  });

  test.each(
    Object.values(SSO_ERROR_CODE).filter((code) => code !== SSO_ERROR_CODE.NETWORK_ERROR)
  )('the %s code shows the bare generic message, with no code appended', (code) => {
    expect(ssoErrorWithCode(code)).toBe(strings.errors.sso_generic);
  });

  test.each([undefined, null, '', 'auth.social_signin_failed', 'DEVELOPER_ERROR', '<script>alert(1)</script>'])(
    'falls back to the bare generic message for %p',
    (code) => {
      expect(ssoErrorWithCode(code)).toBe(strings.errors.sso_generic);
    }
  );

  test('never renders a digit-only suffix or parentheses for any code', () => {
    const allCodes = [...Object.values(SSO_ERROR_CODE), APPLE_ERROR_CODE_UNKNOWN, 'DEVELOPER_ERROR', 'auth.social_signin_failed'];
    for (const code of allCodes) {
      const rendered = ssoErrorWithCode(code);
      expect(rendered).not.toMatch(/\(\s*\d+\s*\)/);
      expect(rendered).not.toContain('(');
      expect(rendered).not.toContain(')');
    }
  });
});
