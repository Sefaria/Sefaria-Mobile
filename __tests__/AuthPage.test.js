import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { SystemButton } from '../Misc';
import TestContextWrapper from '../TestContextWrapper';
import { AuthPage, AuthTextInput, ssoCollisionMessage, ssoErrorWithCode, ssoOnlyAccountMessage, FORGOT_PASSWORD_VIEW, forgotPasswordViewForResult, forgotPasswordBannerError } from '../AuthPage';
import { SSOButtons } from '../SSOButtons';
import SSOErrorBanner from '../SSOErrorBanner';
import strings from '../LocalizedStrings';
import { AUTH_MODE, AUTH_FLOW_INTENT, ANALYTICS_STATUS, ANALYTICS_OUTCOME, ANALYTICS_REASON, SSO_ERROR_CODE, SSO_PROVIDER, AUTH_ERROR_CODE, APPLE_ERROR_CODE_UNKNOWN } from '../AuthConstants';
import { AUTH_EVENT } from '../analytics/authEvents';
import { trackEvent } from '../analytics/events';

// AuthPage's analytics calls go through the real trackEvent(...), which
// chains into Firebase's mocked logEvent via a NetInfo/AsyncStorage-reading
// enrichment step (see analytics/enrichments.js) that isn't relevant here.
// Mocking the module directly lets the analytics-event tests below assert on
// exactly what AuthPage passed in, with no enrichment noise to filter out.
jest.mock('../analytics/events', () => ({ trackEvent: jest.fn() }));

// The forgot-password banner's provider links go through the same native
// require() as SSOButtons' own buttons (createGoogleSignInHandler in
// SSOButtons.js); there's no SSOButtons instance here to bypass it via a prop,
// so this mock stands in for the module directly. virtual: true because Jest
// would otherwise try to load the real (broken) module first.
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signOut: jest.fn(async () => {}),
    signIn: jest.fn(async () => ({
      data: { idToken: 'google-id-token', user: { email: 'google@sefaria.org', givenName: 'Bob', familyName: 'Bobson' } },
    })),
  },
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' },
}), { virtual: true });


const AuthPageWrapper = ({ authMode }) => (
  <TestContextWrapper child={AuthPage} childProps={{
    close: () => {},
    authMode,
    showToast: () => {},
    openLogin: () => {},
    openRegister: () => {},
    openForgotPassword: () => {},
    openUri: () => {},
  }} />
)

// AuthPage's flow_started useEffect fires an unawaited trackEvent(...) call
// that chains through real NetInfo/AsyncStorage reads. Under React 19 +
// react-test-renderer, renderer.create() must be wrapped in act() so those
// passive effects settle before the test body continues -- otherwise they
// resolve on a later tick and can crash after Jest tears down the module
// registry. Each instance is unmounted in afterEach for the same reason.
let currentInstance;

afterEach(() => {
  if (currentInstance) {
    act(() => { currentInstance.unmount(); });
    currentInstance = null;
  }
});

describe('login', () => {

  test('num fields', () => {
    act(() => { currentInstance = renderer.create(<AuthPageWrapper authMode={AUTH_MODE.LOGIN} />); });
    const inputs = currentInstance.root.findAllByType(AuthTextInput);
    expect(inputs.length).toBe(2);
  });
  test('fields sent onSubmit', async () => {
    Sefaria.api.authenticate = jest.fn();
    act(() => { currentInstance = renderer.create(<AuthPageWrapper authMode={AUTH_MODE.LOGIN} />); });
    const inputs = currentInstance.root.findAllByType(AuthTextInput);
    const fields = {
      [strings.account.email]: 'bob@bobandco.co',
      [strings.account.password]: 'bobI$daB3st',
    };
    for (let i of inputs) {
      act(() => {
        i.props.onChangeText(fields[i.props.placeholder]);
      });
    }
    const button = currentInstance.root.findByType(SystemButton);
    await act(async () => { await button.props.onPress() });
    // NOTE: this test won't pass until act can run async
    expect(Sefaria.api.authenticate.mock.calls.length).toBe(1);
    expect(Sefaria.api.authenticate.mock.calls[0][0]).toEqual({
      first_name: null,
      last_name: null,
      email: fields[strings.account.email],
      password: fields[strings.account.password],
      mobile_app_key: '',
    });
    expect(Sefaria.api.authenticate.mock.calls[0][1]).toBe(AUTH_MODE.LOGIN);
  });

  // Entry-point regression for the forgot-password screen: "Forgot your
  // password?" used to open mobile web (openUri) directly; it must now enter
  // AUTH_MODE.FORGOT_PASSWORD via the openForgotPassword prop instead, per the
  // design doc's Entry point section.
  test('"Forgot your password?" calls openForgotPassword, not openUri', () => {
    const openForgotPassword = jest.fn();
    const openUri = jest.fn();
    act(() => {
      currentInstance = renderer.create(
        <TestContextWrapper child={AuthPage} childProps={{
          close: () => {},
          authMode: AUTH_MODE.LOGIN,
          showToast: () => {},
          openLogin: () => {},
          openRegister: () => {},
          openForgotPassword,
          openUri,
        }} />
      );
    });
    const forgotPasswordLink = currentInstance.root.findAllByType(require('react-native').TouchableOpacity)
      .find((t) => t.props.onPress === openForgotPassword);
    expect(forgotPasswordLink).toBeDefined();
    act(() => { forgotPasswordLink.props.onPress(); });
    expect(openForgotPassword).toHaveBeenCalled();
    expect(openUri).not.toHaveBeenCalled();
  });
});

describe('register', () => {
  test('num fields', () => {
    act(() => { currentInstance = renderer.create(<AuthPageWrapper authMode={AUTH_MODE.REGISTER} />); });
    const inputs = currentInstance.root.findAllByType(AuthTextInput);
    expect(inputs.length).toBe(4);
  });
});

// Regression guard for the "login with email after SSO fails silently" bug:
// api/login/ (django-rest-framework-simplejwt's TokenObtainPairView) rejects
// bad credentials with a bare `{"detail": "..."}` body. authenticate() (auth.js)
// forwards that verbatim as `errors`, and AuthPage previously had no render
// path for a `detail` key -- setErrors(...) succeeded, nothing threw, and the
// user saw literally nothing happen.
describe('a failed email login with only an unrendered error field', () => {
  test('surfaces the generic message via the SSO error banner, not silence', async () => {
    Sefaria.api.authenticate = jest.fn(async () => ({ detail: 'No active account found with the given credentials' }));
    act(() => { currentInstance = renderer.create(<AuthPageWrapper authMode={AUTH_MODE.LOGIN} />); });

    const button = currentInstance.root.findByType(SystemButton);
    await act(async () => { await button.props.onPress(); });

    const { error } = currentInstance.root.findByType(SSOErrorBanner).props;
    expect(error).not.toBeNull();
    expect(error.message).toBe(strings.errors.sso_generic);
    expect(error.message).not.toContain('No active account');
  });
});

// Regression guard: field errors AuthPage already renders inline (via their
// own <AuthTextInput>) must NOT also trip the generic "Something went wrong"
// banner (hasUnrenderedEmailError / KNOWN_EMAIL_ERROR_FIELDS in AuthPage.js).
// first_name/last_name and password2 were missing from that list, so a
// register response carrying only one of those fields rendered the correct
// inline message AND a contradictory generic banner on top of it.
describe('register errors that have a dedicated inline surface show no generic banner', () => {
  const submitRegister = async (response) => {
    Sefaria.api.authenticate = jest.fn(async () => response);
    act(() => { currentInstance = renderer.create(<AuthPageWrapper authMode={AUTH_MODE.REGISTER} />); });
    const button = currentInstance.root.findByType(SystemButton);
    await act(async () => { await button.props.onPress(); });
  };

  test('a first_name-only error renders inline with no generic banner', async () => {
    await submitRegister({ first_name: ['This field is required.'] });
    const { error } = currentInstance.root.findByType(SSOErrorBanner).props;
    expect(error).toBeNull();
    const [firstNameInput] = currentInstance.root.findAllByType(AuthTextInput)
      .filter((i) => i.props.placeholder === strings.account.first_name);
    expect(firstNameInput.props.error).toEqual(['This field is required.']);
  });

  test('a last_name-only error renders inline with no generic banner', async () => {
    await submitRegister({ last_name: ['This field is required.'] });
    const { error } = currentInstance.root.findByType(SSOErrorBanner).props;
    expect(error).toBeNull();
    const [lastNameInput] = currentInstance.root.findAllByType(AuthTextInput)
      .filter((i) => i.props.placeholder === strings.account.last_name);
    expect(lastNameInput.props.error).toEqual(['This field is required.']);
  });

  // Django's UserCreationForm._post_clean attaches password-strength failures
  // to password2 (register posts both password1 and password2, see auth.js),
  // not to password/password1.
  test('a password2-only error renders the real message with no generic banner', async () => {
    await submitRegister({ password2: ['This password is too short. It must contain at least 8 characters.'] });
    const { error } = currentInstance.root.findByType(SSOErrorBanner).props;
    expect(error).toBeNull();
    const [passwordInput] = currentInstance.root.findAllByType(AuthTextInput)
      .filter((i) => i.props.isPW);
    expect(passwordInput.props.error).toEqual(['This password is too short. It must contain at least 8 characters.']);
    expect(passwordInput.props.errorText).toEqual(['This password is too short. It must contain at least 8 characters.']);
  });
});

// End-to-end coverage for the api/login/ sso_only_account contract: a login
// attempt against an SSO-only account returns HTTP 401 with
// {"error": "auth.generic_error", "_auth": {"code": "sso_only_account", "providers": [...]}}.
// authenticate() forwards that body verbatim as `errors`, so `_auth` lands in
// `errors._auth` exactly like the plain-`detail` case above -- these tests are
// the regression guard that the MORE SPECIFIC sso_only_account message wins
// over that generic fallback instead of being masked by it (see
// hasUnrenderedEmailError / ssoOnlyAccountErrorMessage in AuthPage.js).
describe('a failed email login against an SSO-only account', () => {
  const submitLogin = async () => {
    act(() => { currentInstance = renderer.create(<AuthPageWrapper authMode={AUTH_MODE.LOGIN} />); });
    const button = currentInstance.root.findByType(SystemButton);
    await act(async () => { await button.props.onPress(); });
    return currentInstance.root.findByType(SSOErrorBanner).props.error;
  };

  test('google-only account shows the Google-specific message', async () => {
    Sefaria.api.authenticate = jest.fn(async () => ({
      error: 'auth.generic_error',
      _auth: { code: 'sso_only_account', providers: ['google'] },
    }));
    const error = await submitLogin();
    expect(error).not.toBeNull();
    expect(error.message).toBe(strings.errors.sso_email_exists_google);
  });

  test('apple-only account shows the Apple-specific message', async () => {
    Sefaria.api.authenticate = jest.fn(async () => ({
      error: 'auth.generic_error',
      _auth: { code: 'sso_only_account', providers: ['apple'] },
    }));
    const error = await submitLogin();
    expect(error.message).toBe(strings.errors.sso_email_exists_apple);
  });

  test('account linked to both providers shows the combined message', async () => {
    Sefaria.api.authenticate = jest.fn(async () => ({
      error: 'auth.generic_error',
      _auth: { code: 'sso_only_account', providers: ['apple', 'google'] },
    }));
    const error = await submitLogin();
    expect(error.message).toBe(strings.errors.sso_email_exists_apple_and_google);
  });

  test('empty providers falls back to the generic SSO error string, not the collision-copy generic', async () => {
    Sefaria.api.authenticate = jest.fn(async () => ({
      error: 'auth.generic_error',
      _auth: { code: 'sso_only_account', providers: [] },
    }));
    const error = await submitLogin();
    // ssoEmailExistsGeneric is register-path collision copy ("An account with
    // this email address already exists.") and carries no SSO signal -- wrong
    // on a login screen. ssoErrorGeneric is the correct (if less specific)
    // fallback here. See ssoOnlyAccountMessage's comment in AuthPage.js.
    expect(error.message).toBe(strings.errors.sso_generic);
    expect(error.message).not.toBe(strings.errors.sso_email_exists_generic);
  });

  test('missing _auth falls back to the plain generic error message (regression)', async () => {
    Sefaria.api.authenticate = jest.fn(async () => ({ detail: 'No active account found with the given credentials' }));
    const error = await submitLogin();
    expect(error.message).toBe(strings.errors.sso_generic);
  });
});

// Both new localized strings exist in the English AND Hebrew blocks, with the
// exact copy the UI-strings sheet specifies (including the Hebrew geresh
// characters and the trailing periods).
describe('new localized strings exist in both languages', () => {
  const originalLanguage = strings.getLanguage();
  afterEach(() => { strings.setLanguage(originalLanguage); });

  test('ssoEmailExistsAppleAndGoogle', () => {
    strings.setLanguage('en');
    expect(strings.errors.sso_email_exists_apple_and_google).toBe('This email address is registered via Google Sign-In and Apple Sign-In.');
    strings.setLanguage('he');
    expect(strings.errors.sso_email_exists_apple_and_google).toBe('דוא״ל זה רשום דרך גוגל ואפל.');
  });

  test('authErrorNetwork', () => {
    strings.setLanguage('en');
    expect(strings.errors.auth_network).toBe('Network error. Check your internet connection.');
    strings.setLanguage('he');
    expect(strings.errors.auth_network).toBe('יש בעיה ברשת. נסו לבדוק את החיבור לאינטרנט.');
  });
});

describe('ssoCollisionMessage', () => {
  test('matches the Google collision sentence', () => {
    expect(ssoCollisionMessage('This email address is already registered via Google Sign-In.'))
      .toBe(strings.errors.sso_email_exists_google);
  });
  test('matches the Apple collision sentence', () => {
    expect(ssoCollisionMessage('This email address is already registered via Apple Sign-In.'))
      .toBe(strings.errors.sso_email_exists_apple);
  });
  test('matches the generic existing-account sentence', () => {
    expect(ssoCollisionMessage('An account with this email address already exists.'))
      .toBe(strings.errors.sso_email_exists_generic);
  });
  test('matches when the backend wraps the sentence in an array', () => {
    expect(ssoCollisionMessage(['This email address is already registered via Google Sign-In.']))
      .toBe(strings.errors.sso_email_exists_google);
  });
  test('returns null for an unrelated field error', () => {
    expect(ssoCollisionMessage('This password is too short.')).toBeNull();
  });
  test('returns null for undefined/empty input', () => {
    expect(ssoCollisionMessage(undefined)).toBeNull();
    expect(ssoCollisionMessage(null)).toBeNull();
  });
});

// Pure-function coverage for the api/login/ sso_only_account contract (shared
// with web's _sso_only_account_error, see AuthPage.js's comment above
// ssoOnlyAccountMessage). `providers` is documented as a set, not an ordered
// list, so these assert on membership rather than array position.
describe('ssoOnlyAccountMessage', () => {
  const authWith = (providers) => ({ code: AUTH_ERROR_CODE.SSO_ONLY_ACCOUNT, providers });

  test('google only', () => {
    expect(ssoOnlyAccountMessage(authWith(['google']))).toBe(strings.errors.sso_email_exists_google);
  });

  test('apple only', () => {
    expect(ssoOnlyAccountMessage(authWith(['apple']))).toBe(strings.errors.sso_email_exists_apple);
  });

  test('both providers, regardless of array order', () => {
    expect(ssoOnlyAccountMessage(authWith(['google', 'apple']))).toBe(strings.errors.sso_email_exists_apple_and_google);
    expect(ssoOnlyAccountMessage(authWith(['apple', 'google']))).toBe(strings.errors.sso_email_exists_apple_and_google);
  });

  test('empty providers falls back to the generic SSO error string', () => {
    expect(ssoOnlyAccountMessage(authWith([]))).toBe(strings.errors.sso_generic);
    expect(ssoOnlyAccountMessage(authWith([]))).not.toBe(strings.errors.sso_email_exists_generic);
  });

  test('missing providers falls back to the generic SSO error string', () => {
    expect(ssoOnlyAccountMessage({ code: AUTH_ERROR_CODE.SSO_ONLY_ACCOUNT })).toBe(strings.errors.sso_generic);
  });

  test('unrecognized provider values fall back to the generic SSO error string', () => {
    expect(ssoOnlyAccountMessage(authWith(['facebook']))).toBe(strings.errors.sso_generic);
  });

  test('returns null when _auth is absent', () => {
    expect(ssoOnlyAccountMessage(undefined)).toBeNull();
    expect(ssoOnlyAccountMessage(null)).toBeNull();
  });

  test('returns null for an unrelated _auth code', () => {
    expect(ssoOnlyAccountMessage({ code: 'some_other_code', providers: ['google'] })).toBeNull();
  });
});

// AuthPage's SSO handlers (handleSSOTokenReceived / handleSSOError) are internal
// to the component, so they are exercised here the way SSOButtons exercises them
// in the app: through the onSSOSuccess / onSSOError props AuthPage hands down.
// What the user ends up seeing is read off the rendered SSOErrorBanner.
describe('SSO handlers', () => {
  const GOOGLE_COLLISION_SENTENCE = 'This email address is already registered via Google Sign-In.';
  const RAW_SERVER_MESSAGE = 'Traceback: allauth.socialaccount.SignupClosedException at /api/auth/google/mobile';

  let props;
  let originalDev;

  beforeEach(() => {
    // Jest runs with __DEV__ true (React Native's preset sets it), which selects
    // AuthPage's developer branch -- the one that deliberately dumps the raw
    // server/SDK text. These tests assert the behaviour users actually get, so
    // the flag is pinned false here and restored afterwards.
    originalDev = global.__DEV__;
    global.__DEV__ = false;
    props = { close: jest.fn(), showToast: jest.fn(), syncProfile: jest.fn() };
    Sefaria.api.socialLogin = jest.fn();
  });

  afterEach(() => { global.__DEV__ = originalDev; });

  const renderAuthPage = (authMode = AUTH_MODE.LOGIN) => {
    act(() => {
      currentInstance = renderer.create(
        <TestContextWrapper child={AuthPage} childProps={{
          authMode,
          close: props.close,
          showToast: props.showToast,
          syncProfile: props.syncProfile,
          openLogin: () => {},
          openRegister: () => {},
          openForgotPassword: () => {},
          openUri: () => {},
        }} />
      );
    });
    return currentInstance;
  };

  const bannerMessage = (instance) => {
    const { error } = instance.root.findByType(SSOErrorBanner).props;
    return error ? error.message : null;
  };

  const ssoProps = (instance) => instance.root.findByType(SSOButtons).props;

  describe('handleSSOTokenReceived', () => {
    test('a successful exchange signs the user in and shows no error', async () => {
      Sefaria.api.socialLogin.mockResolvedValue({ success: true, email: 'token@sefaria.org', is_new_account: false });
      const instance = renderAuthPage();
      const userData = { email: null, firstName: 'Bob', lastName: 'Bobson' };
      await act(async () => { await ssoProps(instance).onSSOSuccess('google', 'id-token', userData); });

      expect(Sefaria.api.socialLogin).toHaveBeenCalledWith('google', 'id-token', userData);
      expect(props.syncProfile).toHaveBeenCalled();
      expect(props.close).toHaveBeenCalledWith(AUTH_MODE.LOGIN);
      expect(props.showToast).toHaveBeenCalledWith(strings.account.login_successful);
      expect(bannerMessage(instance)).toBeNull();
    });

    test('a failed exchange surfaces the failure CODE, never the raw server message', async () => {
      Sefaria.api.socialLogin.mockResolvedValue({
        success: false,
        code: SSO_ERROR_CODE.NETWORK_ERROR,
        analyticsError: ANALYTICS_REASON.NETWORK_ERROR,
        error: { non_field_errors: RAW_SERVER_MESSAGE },
      });
      const instance = renderAuthPage();
      await act(async () => { await ssoProps(instance).onSSOSuccess('google', 'id-token', {}); });

      expect(bannerMessage(instance)).toBe(ssoErrorWithCode(SSO_ERROR_CODE.NETWORK_ERROR));
      expect(bannerMessage(instance)).not.toContain(RAW_SERVER_MESSAGE);
      expect(props.close).not.toHaveBeenCalled();
      expect(props.showToast).not.toHaveBeenCalled();
    });

    test('a server-controlled code is clamped before it reaches the banner', async () => {
      Sefaria.api.socialLogin.mockResolvedValue({ success: false, code: '<script>alert(1)</script>' });
      const instance = renderAuthPage();
      await act(async () => { await ssoProps(instance).onSSOSuccess('google', 'id-token', {}); });

      expect(bannerMessage(instance)).not.toContain('<script>');
    });
  });

  describe('handleSSOError', () => {
    test('surfaces the SDK error code and not its message', async () => {
      const instance = renderAuthPage();
      await act(async () => {
        ssoProps(instance).onSSOError({ code: 'DEVELOPER_ERROR', message: 'com.google.android.gms 10: misconfigured SHA-1' });
      });

      expect(bannerMessage(instance)).toBe(ssoErrorWithCode('DEVELOPER_ERROR'));
      expect(bannerMessage(instance)).not.toContain('SHA-1');
    });

    test('falls back to the generic message when the error carries no code', async () => {
      const instance = renderAuthPage();
      await act(async () => { ssoProps(instance).onSSOError(new Error('Google sign-in did not return an identity token.')); });

      expect(bannerMessage(instance)).toBe(strings.errors.sso_generic);
      expect(bannerMessage(instance)).not.toContain('identity token');
    });

    // Regression guard for the reported bug: Apple's SDK (via SSOButtons'
    // onSSOError(error), which passes the raw SDK error object) sends error
    // code '1000' (AppleError.UNKNOWN) for the airplane-mode/no-connectivity
    // case reported as "יש תקלה, נסו שוב 1000". This previously fell through
    // to the bare generic message instead of the agreed network-error copy.
    test("Apple's '1000' unknown-error code shows the network error message", async () => {
      const instance = renderAuthPage();
      await act(async () => {
        ssoProps(instance).onSSOError({ code: APPLE_ERROR_CODE_UNKNOWN, message: 'The operation could not be completed.' });
      });

      expect(bannerMessage(instance)).toBe(strings.errors.auth_network);
      expect(bannerMessage(instance)).not.toContain('1000');
    });
  });

  // Regression guard. The banner renders `ssoError || emailCollisionMessage`,
  // so an SSO error left over from an earlier attempt outranked the collision
  // message -- a user who hit an SSO failure and then registered by email with
  // an already-Google-linked address saw the stale SSO code and no explanation,
  // while the inline field error stayed suppressed by the collision branch.
  // Submitting must clear the stale error first.
  describe('a stale SSO error', () => {
    const submit = async (instance) => {
      const button = instance.root.findByType(SystemButton);
      await act(async () => { await button.props.onPress(); });
    };

    test('is cleared on submit so the collision message can be seen', async () => {
      Sefaria.api.authenticate = jest.fn(async () => ({ email: [GOOGLE_COLLISION_SENTENCE] }));
      const instance = renderAuthPage(AUTH_MODE.REGISTER);

      await act(async () => { ssoProps(instance).onSSOError({ code: 'DEVELOPER_ERROR' }); });
      expect(bannerMessage(instance)).toBe(ssoErrorWithCode('DEVELOPER_ERROR'));

      await submit(instance);
      expect(bannerMessage(instance)).toBe(strings.errors.sso_email_exists_google);
    });

    test('does not linger after a submit that raises no error of its own', async () => {
      Sefaria.api.authenticate = jest.fn(async () => ({}));
      const instance = renderAuthPage(AUTH_MODE.LOGIN);

      await act(async () => { ssoProps(instance).onSSOError({ code: 'DEVELOPER_ERROR' }); });
      expect(bannerMessage(instance)).not.toBeNull();

      await submit(instance);
      expect(bannerMessage(instance)).toBeNull();
    });
  });
});

// Covers the auth_* analytics event contract directly: event names, the
// flow_intent/outcome/error field shapes, and the outcome key being truly
// absent (not just falsy) on failure.
describe('auth analytics events', () => {
  let originalAuth;

  beforeEach(() => {
    trackEvent.mockClear();
    Sefaria.api.socialLogin = jest.fn();
    originalAuth = Sefaria._auth;
  });

  afterEach(() => { Sefaria._auth = originalAuth; });

  const renderAuthPage = (authMode, props = {}) => {
    act(() => {
      currentInstance = renderer.create(
        <TestContextWrapper child={AuthPage} childProps={{
          authMode,
          close: jest.fn(),
          showToast: jest.fn(),
          syncProfile: jest.fn(),
          openLogin: () => {},
          openRegister: () => {},
          openForgotPassword: () => {},
          openUri: () => {},
          ...props,
        }} />
      );
    });
    return currentInstance;
  };

  // Every trackEvent(name, params) call as [name, params]; filtering by name
  // gets the params object AuthPage actually built for that event.
  const paramsFor = (eventName) => trackEvent.mock.calls
    .filter(([name]) => name === eventName)
    .map(([, params]) => params);
  const lastParamsFor = (eventName) => paramsFor(eventName).at(-1);

  test.each([
    [AUTH_MODE.REGISTER, AUTH_FLOW_INTENT.REGISTRATION],
    [AUTH_MODE.LOGIN, AUTH_FLOW_INTENT.LOGIN],
  ])('flow_started carries flow_intent for authMode %s', (authMode, expectedIntent) => {
    renderAuthPage(authMode);
    expect(lastParamsFor(AUTH_EVENT.FLOW_STARTED)).toEqual(expect.objectContaining({ flow_intent: expectedIntent }));
  });

  // Forgot-password isn't part of the auth_* funnel: no flow-level bookends,
  // on mount or on unmount, even though it shares the same trackEvent plumbing.
  test('forgot-password mode fires neither flow_started nor flow_ended', () => {
    renderAuthPage(AUTH_MODE.FORGOT_PASSWORD);
    act(() => { currentInstance.unmount(); });
    currentInstance = null;

    expect(paramsFor(AUTH_EVENT.FLOW_STARTED)).toEqual([]);
    expect(paramsFor(AUTH_EVENT.FLOW_ENDED)).toEqual([]);
  });

  test('a successful email submit reports outcome on process_ended, no error key', async () => {
    // onSubmit's success check is `no field errors AND Sefaria._auth.uid`
    // (see AuthPage.js's onSubmit) -- the real authenticate() sets uid as a
    // side effect of storing the token, which this mock skips.
    Sefaria.api.authenticate = jest.fn(async () => { Sefaria._auth = { uid: 'test-uid' }; return {}; });
    renderAuthPage(AUTH_MODE.REGISTER);
    const button = currentInstance.root.findByType(SystemButton);
    await act(async () => { await button.props.onPress(); });

    const params = lastParamsFor(AUTH_EVENT.PROCESS_ENDED);
    expect(params).toEqual(expect.objectContaining({ status: ANALYTICS_STATUS.SUCCESS, outcome: ANALYTICS_OUTCOME.CREATED_NEW_ACCOUNT }));
    expect(params).not.toHaveProperty('error');
  });

  test('a failed email submit omits outcome on process_ended and reports an error', async () => {
    Sefaria.api.authenticate = jest.fn(async () => ({ email: ['bad'] }));
    renderAuthPage(AUTH_MODE.LOGIN);
    const button = currentInstance.root.findByType(SystemButton);
    await act(async () => { await button.props.onPress(); });

    const params = lastParamsFor(AUTH_EVENT.PROCESS_ENDED);
    expect(params).toEqual(expect.objectContaining({ status: ANALYTICS_STATUS.FAILURE, error: ANALYTICS_REASON.VALIDATION_FAILED }));
    expect(params).not.toHaveProperty('outcome');
  });

  test('abandoning the flow (unmount with no success) fires flow_ended with error: abandoned and no outcome', () => {
    renderAuthPage(AUTH_MODE.LOGIN);
    act(() => { currentInstance.unmount(); });
    currentInstance = null;

    const params = lastParamsFor(AUTH_EVENT.FLOW_ENDED);
    expect(params).toEqual(expect.objectContaining({ status: ANALYTICS_STATUS.FAILURE, error: ANALYTICS_REASON.ABANDONED }));
    expect(params).not.toHaveProperty('outcome');
  });

  test('a failed attempt followed by abandonment reports the real failure, not "abandoned"', async () => {
    Sefaria.api.socialLogin.mockResolvedValue({
      success: false,
      code: SSO_ERROR_CODE.NETWORK_ERROR,
      analyticsError: ANALYTICS_REASON.NETWORK_ERROR,
      error: { non_field_errors: 'Network error during sign-in' },
    });
    renderAuthPage(AUTH_MODE.LOGIN);
    const ssoProps = currentInstance.root.findByType(SSOButtons).props;
    act(() => { ssoProps.onMethodChosen('google'); });
    await act(async () => { await ssoProps.onSSOSuccess('google', 'id-token', {}); });
    act(() => { currentInstance.unmount(); });
    currentInstance = null;

    const params = lastParamsFor(AUTH_EVENT.FLOW_ENDED);
    expect(params).toEqual(expect.objectContaining({ status: ANALYTICS_STATUS.FAILURE, error: SSO_ERROR_CODE.NETWORK_ERROR }));
    expect(params.error).not.toBe(ANALYTICS_REASON.ABANDONED);
    expect(params).not.toHaveProperty('outcome');
  });

  test('a flow that succeeds before unmount fires flow_ended with outcome and no error', async () => {
    Sefaria.api.authenticate = jest.fn(async () => { Sefaria._auth = { uid: 'test-uid' }; return {}; });
    renderAuthPage(AUTH_MODE.LOGIN);
    const button = currentInstance.root.findByType(SystemButton);
    await act(async () => { await button.props.onPress(); });
    act(() => { currentInstance.unmount(); });
    currentInstance = null;

    const params = lastParamsFor(AUTH_EVENT.FLOW_ENDED);
    expect(params).toEqual(expect.objectContaining({ status: ANALYTICS_STATUS.SUCCESS, outcome: ANALYTICS_OUTCOME.EXISTING_USER_LOGIN }));
    expect(params).not.toHaveProperty('error');
  });

  // The is_new_account -> outcome mapping, including the case where
  // socialLogin's response omits the field and AuthPage falls back to the
  // same authMode-based rule email/password success uses.
  describe('SSO success maps is_new_account to outcome', () => {
    const ssoSucceedsWith = async (authMode, isNewAccount) => {
      Sefaria.api.socialLogin.mockResolvedValue({
        success: true,
        email: 'sso@sefaria.org',
        ...(isNewAccount !== undefined ? { is_new_account: isNewAccount } : {}),
      });
      renderAuthPage(authMode);
      const ssoProps = currentInstance.root.findByType(SSOButtons).props;
      // Mints the attempt_id fireProcessEnded requires -- SSOButtons' real
      // handlers always call onMethodChosen before onSSOSuccess (see
      // SSOButtons.js), so this mirrors the actual call order.
      act(() => { ssoProps.onMethodChosen('google'); });
      await act(async () => { await ssoProps.onSSOSuccess('google', 'id-token', {}); });
      return lastParamsFor(AUTH_EVENT.PROCESS_ENDED);
    };

    test('is_new_account: true -> created_new_account', async () => {
      const params = await ssoSucceedsWith(AUTH_MODE.LOGIN, true);
      expect(params.outcome).toBe(ANALYTICS_OUTCOME.CREATED_NEW_ACCOUNT);
    });

    test('is_new_account: false -> existing_user_login', async () => {
      const params = await ssoSucceedsWith(AUTH_MODE.LOGIN, false);
      expect(params.outcome).toBe(ANALYTICS_OUTCOME.EXISTING_USER_LOGIN);
    });

    test('is_new_account: undefined falls back to authMode derivation (register)', async () => {
      const params = await ssoSucceedsWith(AUTH_MODE.REGISTER, undefined);
      expect(params.outcome).toBe(ANALYTICS_OUTCOME.CREATED_NEW_ACCOUNT);
    });

    test('is_new_account: undefined falls back to authMode derivation (login)', async () => {
      const params = await ssoSucceedsWith(AUTH_MODE.LOGIN, undefined);
      expect(params.outcome).toBe(ANALYTICS_OUTCOME.EXISTING_USER_LOGIN);
    });
  });

  test('SSO failure omits outcome and reports the raw code as error', async () => {
    Sefaria.api.socialLogin.mockResolvedValue({
      success: false,
      code: SSO_ERROR_CODE.NETWORK_ERROR,
      analyticsError: ANALYTICS_REASON.NETWORK_ERROR,
      error: { non_field_errors: 'Network error during sign-in' },
    });
    renderAuthPage(AUTH_MODE.LOGIN);
    const ssoProps = currentInstance.root.findByType(SSOButtons).props;
    act(() => { ssoProps.onMethodChosen('google'); });
    await act(async () => { await ssoProps.onSSOSuccess('google', 'id-token', {}); });

    const params = lastParamsFor(AUTH_EVENT.PROCESS_ENDED);
    expect(params).toEqual(expect.objectContaining({ status: ANALYTICS_STATUS.FAILURE, error: SSO_ERROR_CODE.NETWORK_ERROR }));
    expect(params).not.toHaveProperty('outcome');
  });

  // Regression for Fix 5: fireProcessEnded falls back to currentMethodRef when
  // no method is passed explicitly, and focusing an email field mid-SSO-flow
  // repoints that ref to 'email' (see beginEmailAttempt). SSOButtons must
  // always pass its own provider explicitly so a Google/Apple process_ended
  // can't get attributed to whatever email attempt happens to be active.
  test('a provider-scoped process_ended is attributed to that provider, not a later email attempt', async () => {
    renderAuthPage(AUTH_MODE.LOGIN);
    const ssoProps = currentInstance.root.findByType(SSOButtons).props;
    act(() => { ssoProps.onMethodChosen('google'); });
    const googleAttemptId = lastParamsFor(AUTH_EVENT.METHOD_CHOSEN).attempt_id;

    // User touches the email field while the Google sign-in is still in
    // flight -- this repoints currentMethodRef to 'email'.
    const emailInput = currentInstance.root.findAllByType(AuthTextInput)
      .find((t) => t.props.placeholder === strings.account.email);
    act(() => { emailInput.props.onFocus(); });
    const emailAttemptId = lastParamsFor(AUTH_EVENT.METHOD_CHOSEN).attempt_id;
    expect(emailAttemptId).not.toBe(googleAttemptId);

    // SSOButtons now always passes its provider explicitly (see SSOButtons.js).
    act(() => { ssoProps.onProcessEnded({ status: ANALYTICS_STATUS.FAILURE, error: ANALYTICS_REASON.CANCELLED }, 'google'); });

    const processEndedParams = lastParamsFor(AUTH_EVENT.PROCESS_ENDED);
    expect(processEndedParams.attempt_id).toBe(googleAttemptId);
    expect(processEndedParams.attempt_id).not.toBe(emailAttemptId);
  });
});

// Coverage for the forgot-password mode (AUTH_MODE.FORGOT_PASSWORD): the form
// is a constant, not swapped out for an error or SSO-only screen -- SENT is
// the only state that replaces it.
describe('forgot password mode', () => {
  let props;

  beforeEach(() => {
    props = { close: jest.fn(), showToast: jest.fn(), syncProfile: jest.fn(), openLogin: jest.fn() };
    Sefaria.api.requestPasswordReset = jest.fn();
    Sefaria.api.socialLogin = jest.fn();
  });

  const renderForgotPasswordPage = () => {
    act(() => {
      currentInstance = renderer.create(
        <TestContextWrapper child={AuthPage} childProps={{
          authMode: AUTH_MODE.FORGOT_PASSWORD,
          close: props.close,
          showToast: props.showToast,
          syncProfile: props.syncProfile,
          openLogin: props.openLogin,
          openRegister: () => {},
          openForgotPassword: () => {},
          openUri: () => {},
        }} />
      );
    });
    return currentInstance;
  };

  const submitEmail = async (instance, email = 'bob@sefaria.org') => {
    const emailInput = instance.root.findByType(AuthTextInput);
    act(() => { emailInput.props.onChangeText(email); });
    const button = instance.root.findByType(SystemButton);
    await act(async () => { await button.props.onPress(); });
  };

  // Returns the banner's row list ({ message, linkText? }[]), or null if no
  // banner is showing -- a bare `{ message }` error is normalized to a
  // one-row list so single-message and multi-row assertions share one helper.
  const bannerRows = (instance) => {
    const banners = instance.root.findAllByType(SSOErrorBanner);
    const withError = banners.find((b) => b.props.error);
    if (!withError) { return null; }
    return withError.props.error.rows || [{ message: withError.props.error.message }];
  };
  const bannerMessage = (instance) => {
    const rows = bannerRows(instance);
    return rows ? rows[0].message : null;
  };
  const backToLoginLink = (instance) => instance.root.findAllByType(require('react-native').TouchableOpacity)
    .find((t) => t.props.onPress === props.openLogin);

  test('renders the form: an email input, a submit button, "Back to login", no banner, no SSO buttons', () => {
    const instance = renderForgotPasswordPage();
    expect(instance.root.findAllByType(AuthTextInput).length).toBe(1);
    expect(instance.root.findByType(AuthTextInput).props.placeholder).toBe(strings.account.forgot_password_email_placeholder);
    expect(instance.root.findByType(SystemButton).props.text).toBe(strings.account.send_reset_link);
    expect(backToLoginLink(instance)).toBeDefined();
    expect(instance.root.findAllByType(SSOButtons).length).toBe(0);
    expect(bannerRows(instance)).toBeNull();
  });

  test('the title is "Forgot Password?"', () => {
    const instance = renderForgotPasswordPage();
    const title = instance.root.findAllByType(require('react-native').Text)
      .find((t) => t.props.children === strings.account.forgot_password_title);
    expect(title).toBeDefined();
  });

  test('"Back to login" calls openLogin', () => {
    const instance = renderForgotPasswordPage();
    act(() => { backToLoginLink(instance).props.onPress(); });
    expect(props.openLogin).toHaveBeenCalled();
  });

  test('a 200 success response replaces the form with the sent state: title, body, no button, no back-to-login', async () => {
    Sefaria.api.requestPasswordReset.mockResolvedValue({ success: true });
    const instance = renderForgotPasswordPage();
    await submitEmail(instance);

    expect(Sefaria.api.requestPasswordReset).toHaveBeenCalledWith('bob@sefaria.org');
    expect(instance.root.findAllByType(AuthTextInput).length).toBe(0);
    expect(instance.root.findAllByType(SystemButton).length).toBe(0);
    expect(backToLoginLink(instance)).toBeUndefined();
    const title = instance.root.findAllByType(require('react-native').Text)
      .find((t) => t.props.children === strings.account.reset_link_sent_title);
    expect(title).toBeDefined();
    const body = instance.root.findAllByType(require('react-native').Text)
      .find((t) => t.props.children === strings.account.reset_link_sent_body);
    expect(body).toBeDefined();
  });

  test('a network failure shows the network-specific banner ABOVE a form that stays usable', async () => {
    Sefaria.api.requestPasswordReset.mockResolvedValue({
      success: false,
      code: SSO_ERROR_CODE.NETWORK_ERROR,
      analyticsError: ANALYTICS_REASON.NETWORK_ERROR,
      error: { non_field_errors: 'Network error' },
    });
    const instance = renderForgotPasswordPage();
    await submitEmail(instance);

    // Same network copy the login/register screen shows for this code, not
    // the bare generic message -- see forgotPasswordBannerError in AuthPage.js.
    expect(bannerMessage(instance)).toBe(strings.errors.auth_network);
    // The form never left: email input, submit button, and the back-to-login
    // link are all still there, no separate "try again" screen to leave.
    expect(instance.root.findAllByType(AuthTextInput).length).toBe(1);
    expect(instance.root.findByType(SystemButton).props.text).toBe(strings.account.send_reset_link);
    expect(backToLoginLink(instance)).toBeDefined();
  });

  test('a 400 auth.invalid_email response also shows the generic banner with the form intact', async () => {
    Sefaria.api.requestPasswordReset.mockResolvedValue({
      success: false,
      code: 'auth.invalid_email',
      analyticsError: ANALYTICS_REASON.SERVER_REJECTED,
      error: { error: 'auth.invalid_email' },
    });
    const instance = renderForgotPasswordPage();
    await submitEmail(instance, 'not-an-email');

    expect(bannerMessage(instance)).toBe(strings.errors.sso_generic);
    expect(instance.root.findAllByType(AuthTextInput).length).toBe(1);
  });

  test('a rejected requestPasswordReset is caught, clears the spinner, and shows the generic banner (regression)', async () => {
    Sefaria.api.requestPasswordReset.mockRejectedValue(new Error('stream error'));
    const instance = renderForgotPasswordPage();
    // requestPasswordReset is documented as classify-don't-throw, but
    // handleForgotPasswordSubmit must not propagate an unexpected throw --
    // it should be caught, not leave an unhandled rejection.
    await expect(submitEmail(instance)).resolves.toBeUndefined();

    expect(instance.root.findByType(SystemButton).props.isLoading).toBe(false);
    expect(bannerMessage(instance)).toBe(strings.errors.sso_generic);
  });

  test('submitting with no email does not call requestPasswordReset', async () => {
    const instance = renderForgotPasswordPage();
    const button = instance.root.findByType(SystemButton);
    await act(async () => { await button.props.onPress(); });

    expect(Sefaria.api.requestPasswordReset).not.toHaveBeenCalled();
  });

  // Provider mapping through the full request -> render flow. Unlike the login
  // screen's single combined sentence, the both-providers case here renders
  // TWO rows (one message+link per provider), matching web's error.providers.map(...).
  describe('sso_only_account provider mapping', () => {
    const ssoOnlyResult = (providers) => ({
      success: false,
      code: AUTH_ERROR_CODE.SSO_ONLY_ACCOUNT,
      analyticsError: ANALYTICS_REASON.SERVER_REJECTED,
      error: { error: 'auth.generic_error', _auth: { code: 'sso_only_account', providers } },
      providers,
    });

    test('google-only shows one row: the Google message plus a "Continue with Google" link', async () => {
      Sefaria.api.requestPasswordReset.mockResolvedValue(ssoOnlyResult(['google']));
      const instance = renderForgotPasswordPage();
      await submitEmail(instance);

      const rows = bannerRows(instance);
      expect(rows).toEqual([{ message: strings.errors.sso_email_exists_google, linkText: strings.account.continue_with_google, onPress: expect.any(Function), disabled: false }]);
      // The form is still there underneath -- no dedicated SSO-only screen.
      expect(instance.root.findAllByType(AuthTextInput).length).toBe(1);
      expect(instance.root.findAllByType(SSOButtons).length).toBe(0);
    });

    test('apple-only shows one row: the Apple message plus a "Continue with Apple" link (iOS)', async () => {
      Sefaria.api.requestPasswordReset.mockResolvedValue(ssoOnlyResult(['apple']));
      const instance = renderForgotPasswordPage();
      await submitEmail(instance);

      const rows = bannerRows(instance);
      expect(rows).toEqual([{ message: strings.errors.sso_email_exists_apple, linkText: strings.account.continue_with_apple, onPress: expect.any(Function), disabled: false }]);
    });

    test('both providers shows TWO rows, one per provider, not the combined sentence', async () => {
      Sefaria.api.requestPasswordReset.mockResolvedValue(ssoOnlyResult(['google', 'apple']));
      const instance = renderForgotPasswordPage();
      await submitEmail(instance);

      const rows = bannerRows(instance);
      expect(rows.length).toBe(2);
      expect(rows[0]).toEqual(expect.objectContaining({ message: strings.errors.sso_email_exists_google, linkText: strings.account.continue_with_google }));
      expect(rows[1]).toEqual(expect.objectContaining({ message: strings.errors.sso_email_exists_apple, linkText: strings.account.continue_with_apple }));
    });

    test('empty providers falls back to the generic SSO error string, with no link', async () => {
      Sefaria.api.requestPasswordReset.mockResolvedValue(ssoOnlyResult([]));
      const instance = renderForgotPasswordPage();
      await submitEmail(instance);

      expect(bannerRows(instance)).toEqual([{ message: strings.errors.sso_generic }]);
    });

    // A response with no _auth key at all never gets classified as
    // sso_only_account by requestPasswordReset (see auth.js), so it must not
    // be read as one here.
    test('missing _auth shows the plain generic banner, not a provider row', async () => {
      Sefaria.api.requestPasswordReset.mockResolvedValue({
        success: false,
        code: SSO_ERROR_CODE.INVALID_RESPONSE,
        analyticsError: ANALYTICS_REASON.INVALID_RESPONSE,
        error: { detail: 'unexpected' },
      });
      const instance = renderForgotPasswordPage();
      await submitEmail(instance);

      expect(bannerRows(instance)).toEqual([{ message: strings.errors.sso_generic }]);
    });
  });

  // forgotPasswordViewForResult pure-function coverage.
  describe('forgotPasswordViewForResult', () => {
    test('success -> sent', () => {
      expect(forgotPasswordViewForResult({ success: true })).toBe(FORGOT_PASSWORD_VIEW.SENT);
    });
    test('any failure, including sso_only_account -> error', () => {
      expect(forgotPasswordViewForResult({ success: false, code: AUTH_ERROR_CODE.SSO_ONLY_ACCOUNT })).toBe(FORGOT_PASSWORD_VIEW.ERROR);
      expect(forgotPasswordViewForResult({ success: false, code: 'auth.invalid_email' })).toBe(FORGOT_PASSWORD_VIEW.ERROR);
      expect(forgotPasswordViewForResult({ success: false, code: SSO_ERROR_CODE.NETWORK_ERROR })).toBe(FORGOT_PASSWORD_VIEW.ERROR);
    });
  });

  // Pure-function coverage for forgotPasswordBannerError: a live ssoError is
  // surfaced ABOVE any sso_only_account rows rather than replacing them, and
  // an actionable-link-less provider (Apple on Android) still gets named.
  describe('forgotPasswordBannerError', () => {
    const deps = { showAppleLink: true, disabled: false, onGoogleLink: () => {}, onAppleLink: () => {} };

    test('a live ssoError is shown alongside the sso_only_account rows, not instead of them', () => {
      const auth = { code: AUTH_ERROR_CODE.SSO_ONLY_ACCOUNT, providers: ['google'] };
      const result = forgotPasswordBannerError(auth, 'a live SSO error', deps);
      expect(result).toEqual({
        rows: [
          { message: 'a live SSO error' },
          { message: strings.errors.sso_email_exists_google, linkText: strings.account.continue_with_google, onPress: deps.onGoogleLink, disabled: false },
        ],
      });
    });

    test('an apple-only result with showAppleLink false (Android) still shows the SSO-only message, with no link', () => {
      const auth = { code: AUTH_ERROR_CODE.SSO_ONLY_ACCOUNT, providers: ['apple'] };
      const result = forgotPasswordBannerError(auth, null, { ...deps, showAppleLink: false });
      expect(result).toEqual({ rows: [{ message: strings.errors.sso_email_exists_apple }] });
    });

    test('no ssoError and no sso_only_account auth -> the generic message', () => {
      expect(forgotPasswordBannerError(null, null, deps)).toEqual({ message: strings.errors.sso_generic });
    });

    test('a network_error result shows the network string, not the generic one', () => {
      const auth = { code: SSO_ERROR_CODE.NETWORK_ERROR };
      expect(forgotPasswordBannerError(auth, null, deps)).toEqual({ message: strings.errors.auth_network });
    });
  });

  // Guards the useSSOSignIn extraction: a sign-in via the banner's "Continue
  // with Google" link must produce the same dispatch/syncProfile/close/toast
  // sequence as the login screen's handleSSOTokenReceived, exercised here
  // through the real createGoogleSignInHandler wiring (top-level google-signin
  // mock) since there's no SSOButtons instance to grab a prop from.
  describe('a provider sign-in from the banner link', () => {
    // Jest runs with __DEV__ true, which selects the raw-message developer
    // branch instead of ssoErrorWithCode(...); pinned false so the failure
    // assertion below checks real user-facing behavior.
    let originalDev;
    beforeEach(() => { originalDev = global.__DEV__; global.__DEV__ = false; });
    afterEach(() => { global.__DEV__ = originalDev; });

    const renderWithGoogleOnlyBanner = async () => {
      Sefaria.api.requestPasswordReset.mockResolvedValue({
        success: false,
        code: AUTH_ERROR_CODE.SSO_ONLY_ACCOUNT,
        providers: ['google'],
      });
      const instance = renderForgotPasswordPage();
      await submitEmail(instance);
      return instance;
    };

    const tapGoogleLink = async (instance) => {
      const [row] = bannerRows(instance);
      await act(async () => { await row.onPress(); });
    };

    test('signs the user in and dismisses the page exactly as the login screen does', async () => {
      Sefaria.api.socialLogin.mockResolvedValue({ success: true, email: 'token@sefaria.org', is_new_account: false });
      const instance = await renderWithGoogleOnlyBanner();

      await tapGoogleLink(instance);

      expect(Sefaria.api.socialLogin).toHaveBeenCalledWith('google', 'google-id-token', {
        email: 'google@sefaria.org', firstName: 'Bob', lastName: 'Bobson',
      });
      expect(props.syncProfile).toHaveBeenCalled();
      expect(props.close).toHaveBeenCalledWith(AUTH_MODE.FORGOT_PASSWORD);
      expect(props.showToast).toHaveBeenCalledWith(strings.account.login_successful);
    });

    test('a failed sign-in from this link surfaces the failure without closing the page', async () => {
      Sefaria.api.socialLogin.mockResolvedValue({
        success: false,
        code: SSO_ERROR_CODE.NETWORK_ERROR,
        analyticsError: ANALYTICS_REASON.NETWORK_ERROR,
        error: { non_field_errors: 'Network error during sign-in' },
      });
      const instance = await renderWithGoogleOnlyBanner();

      await tapGoogleLink(instance);

      expect(props.close).not.toHaveBeenCalled();
      expect(props.showToast).not.toHaveBeenCalled();
      // The live failure now outranks the sso_only_account row (see
      // forgotPasswordBannerError's precedence test above) -- the banner
      // switches to the plain failure-code message.
      expect(bannerMessage(instance)).toBe(ssoErrorWithCode(SSO_ERROR_CODE.NETWORK_ERROR));
    });
  });
});
