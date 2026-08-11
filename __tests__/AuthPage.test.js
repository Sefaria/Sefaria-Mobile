import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { SystemButton } from '../Misc';
import TestContextWrapper from '../TestContextWrapper';
import { AuthPage, AuthTextInput, ssoCollisionMessage, ssoErrorWithCode } from '../AuthPage';
import { SSOButtons } from '../SSOButtons';
import SSOErrorBanner from '../SSOErrorBanner';
import strings from '../LocalizedStrings';
import { AUTH_MODE, AUTH_FLOW_INTENT, ANALYTICS_STATUS, ANALYTICS_OUTCOME, ANALYTICS_REASON, SSO_ERROR_CODE } from '../AuthConstants';
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
