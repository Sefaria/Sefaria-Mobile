import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { SystemButton } from '../Misc';
import TestContextWrapper from '../TestContextWrapper';
import { AuthPage, AuthTextInput, ssoCollisionMessage, ssoErrorWithCode, ssoOnlyAccountMessage } from '../AuthPage';
import { SSOButtons } from '../SSOButtons';
import SSOErrorBanner from '../SSOErrorBanner';
import strings from '../LocalizedStrings';
import { AUTH_MODE, AUTH_FLOW_INTENT, ANALYTICS_STATUS, ANALYTICS_OUTCOME, ANALYTICS_REASON, SSO_ERROR_CODE, AUTH_ERROR_CODE, APPLE_ERROR_CODE_UNKNOWN } from '../AuthConstants';
import { AUTH_EVENT } from '../analytics/authEvents';
import { trackEvent } from '../analytics/events';

// AuthPage's analytics calls go through the real trackEvent(...), which
// chains into Firebase's mocked logEvent via a NetInfo/AsyncStorage-reading
// enrichment step (see analytics/enrichments.js) that isn't relevant here.
// Mocking the module directly lets the analytics-event tests below assert on
// exactly what AuthPage passed in, with no enrichment noise to filter out.
jest.mock('../analytics/events', () => ({ trackEvent: jest.fn() }));


const AuthPageWrapper = ({ authMode }) => (
  <TestContextWrapper child={AuthPage} childProps={{
    close: () => {},
    authMode,
    showToast: () => {},
    openLogin: () => {},
    openRegister: () => {},
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
      [strings.email]: 'bob@bobandco.co',
      [strings.password]: 'bobI$daB3st',
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
      email: fields[strings.email],
      password: fields[strings.password],
      mobile_app_key: '',
    });
    expect(Sefaria.api.authenticate.mock.calls[0][1]).toBe(AUTH_MODE.LOGIN);
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
    expect(error.message).toBe(strings.ssoErrorGeneric);
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
      .filter((i) => i.props.placeholder === strings.first_name);
    expect(firstNameInput.props.error).toEqual(['This field is required.']);
  });

  test('a last_name-only error renders inline with no generic banner', async () => {
    await submitRegister({ last_name: ['This field is required.'] });
    const { error } = currentInstance.root.findByType(SSOErrorBanner).props;
    expect(error).toBeNull();
    const [lastNameInput] = currentInstance.root.findAllByType(AuthTextInput)
      .filter((i) => i.props.placeholder === strings.last_name);
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
    expect(error.message).toBe(strings.ssoEmailExistsGoogle);
  });

  test('apple-only account shows the Apple-specific message', async () => {
    Sefaria.api.authenticate = jest.fn(async () => ({
      error: 'auth.generic_error',
      _auth: { code: 'sso_only_account', providers: ['apple'] },
    }));
    const error = await submitLogin();
    expect(error.message).toBe(strings.ssoEmailExistsApple);
  });

  test('account linked to both providers shows the combined message', async () => {
    Sefaria.api.authenticate = jest.fn(async () => ({
      error: 'auth.generic_error',
      _auth: { code: 'sso_only_account', providers: ['apple', 'google'] },
    }));
    const error = await submitLogin();
    expect(error.message).toBe(strings.ssoEmailExistsAppleAndGoogle);
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
    expect(error.message).toBe(strings.ssoErrorGeneric);
    expect(error.message).not.toBe(strings.ssoEmailExistsGeneric);
  });

  test('missing _auth falls back to the plain generic error message (regression)', async () => {
    Sefaria.api.authenticate = jest.fn(async () => ({ detail: 'No active account found with the given credentials' }));
    const error = await submitLogin();
    expect(error.message).toBe(strings.ssoErrorGeneric);
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
    expect(strings.ssoEmailExistsAppleAndGoogle).toBe('This email address is registered via Google Sign-In and Apple Sign-In.');
    strings.setLanguage('he');
    expect(strings.ssoEmailExistsAppleAndGoogle).toBe('דוא״ל זה רשום דרך גוגל ואפל.');
  });

  test('authErrorNetwork', () => {
    strings.setLanguage('en');
    expect(strings.authErrorNetwork).toBe('Network error. Check your internet connection.');
    strings.setLanguage('he');
    expect(strings.authErrorNetwork).toBe('יש בעיה ברשת. נסו לבדוק את החיבור לאינטרנט.');
  });
});

describe('ssoCollisionMessage', () => {
  test('matches the Google collision sentence', () => {
    expect(ssoCollisionMessage('This email address is already registered via Google Sign-In.'))
      .toBe(strings.ssoEmailExistsGoogle);
  });
  test('matches the Apple collision sentence', () => {
    expect(ssoCollisionMessage('This email address is already registered via Apple Sign-In.'))
      .toBe(strings.ssoEmailExistsApple);
  });
  test('matches the generic existing-account sentence', () => {
    expect(ssoCollisionMessage('An account with this email address already exists.'))
      .toBe(strings.ssoEmailExistsGeneric);
  });
  test('matches when the backend wraps the sentence in an array', () => {
    expect(ssoCollisionMessage(['This email address is already registered via Google Sign-In.']))
      .toBe(strings.ssoEmailExistsGoogle);
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
    expect(ssoOnlyAccountMessage(authWith(['google']))).toBe(strings.ssoEmailExistsGoogle);
  });

  test('apple only', () => {
    expect(ssoOnlyAccountMessage(authWith(['apple']))).toBe(strings.ssoEmailExistsApple);
  });

  test('both providers, regardless of array order', () => {
    expect(ssoOnlyAccountMessage(authWith(['google', 'apple']))).toBe(strings.ssoEmailExistsAppleAndGoogle);
    expect(ssoOnlyAccountMessage(authWith(['apple', 'google']))).toBe(strings.ssoEmailExistsAppleAndGoogle);
  });

  test('empty providers falls back to the generic SSO error string', () => {
    expect(ssoOnlyAccountMessage(authWith([]))).toBe(strings.ssoErrorGeneric);
    expect(ssoOnlyAccountMessage(authWith([]))).not.toBe(strings.ssoEmailExistsGeneric);
  });

  test('missing providers falls back to the generic SSO error string', () => {
    expect(ssoOnlyAccountMessage({ code: AUTH_ERROR_CODE.SSO_ONLY_ACCOUNT })).toBe(strings.ssoErrorGeneric);
  });

  test('unrecognized provider values fall back to the generic SSO error string', () => {
    expect(ssoOnlyAccountMessage(authWith(['facebook']))).toBe(strings.ssoErrorGeneric);
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
      expect(props.showToast).toHaveBeenCalledWith(strings.loginSuccessful);
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

      expect(bannerMessage(instance)).toBe(strings.ssoErrorGeneric);
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

      expect(bannerMessage(instance)).toBe(strings.authErrorNetwork);
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
      expect(bannerMessage(instance)).toBe(strings.ssoEmailExistsGoogle);
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
});
