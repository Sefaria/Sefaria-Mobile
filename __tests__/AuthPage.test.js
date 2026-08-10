import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { SystemButton } from '../Misc';
import TestContextWrapper from '../TestContextWrapper';
import { AuthPage, AuthTextInput, ssoCollisionMessage, ssoErrorWithCode } from '../AuthPage';
import { SSOButtons } from '../SSOButtons';
import SSOErrorBanner from '../SSOErrorBanner';
import strings from '../LocalizedStrings';
import { AUTH_MODE, ANALYTICS_REASON, SSO_ERROR_CODE } from '../AuthConstants';


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
        analyticsReason: ANALYTICS_REASON.NETWORK_ERROR,
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
