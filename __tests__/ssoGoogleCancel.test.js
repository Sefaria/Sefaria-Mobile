import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';
import TestContextWrapper from '../TestContextWrapper';
import { SSOButtons } from '../SSOButtons';
import themeWhite from '../ThemeWhite';
import { AUTH_MODE, ANALYTICS_STATUS, ANALYTICS_REASON } from '../AuthConstants';

// @react-native-google-signin/google-signin v13 changed signIn()'s contract:
// cancelling now RESOLVES with { type: 'cancelled', data: null } instead of
// rejecting with statusCodes.SIGN_IN_CANCELLED. Code written against the old
// contract reads response.data?.idToken, gets undefined, and reports the
// cancellation as a provider error -- which is what a user on a device with no
// Google account actually saw:
//
//   'SSO Error:', [Error: Google sign-in did not return an identity token.]
//
// These assert the cancel is recognised as a cancel, so the user sees no error
// banner and analytics records `cancelled` rather than `provider_error`.
const CANCELLED = { type: 'cancelled', data: null };
const SUCCESS = { type: 'success', data: { idToken: 'tok', user: {} } };

let mockSignInResult;

let mockSignInRejection;

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signOut: jest.fn(() => Promise.resolve()),
    signIn: jest.fn(() => (mockSignInRejection ? Promise.reject(mockSignInRejection) : Promise.resolve(mockSignInResult))),
  },
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' },
}));

const pressGoogle = async (handlers) => {
  let instance;
  await act(async () => {
    instance = renderer.create(
      <TestContextWrapper child={SSOButtons} childProps={{ authMode: AUTH_MODE.LOGIN, theme: themeWhite, ...handlers }} />
    );
  });
  const googleButton = instance.root.findAllByType(TouchableOpacity)[0];
  await act(async () => { await googleButton.props.onPress(); });
  await act(async () => { instance.unmount(); });
};

const makeHandlers = () => ({
  onSSOSuccess: jest.fn(),
  onSSOError: jest.fn(),
  onMethodChosen: jest.fn(),
  onProcessStarted: jest.fn(),
  onProcessEnded: jest.fn(),
});

describe('Google sign-in cancellation', () => {
  test('a cancelled sign-in raises no error', async () => {
    mockSignInResult = CANCELLED;
    const handlers = makeHandlers();
    await pressGoogle(handlers);
    expect(handlers.onSSOError).not.toHaveBeenCalled();
  });

  test('a cancelled sign-in is reported as cancelled, not a provider error', async () => {
    mockSignInResult = CANCELLED;
    const handlers = makeHandlers();
    await pressGoogle(handlers);
    expect(handlers.onProcessEnded).toHaveBeenCalledWith(
      expect.objectContaining({ status: ANALYTICS_STATUS.FAILURE, error: ANALYTICS_REASON.CANCELLED })
    );
  });

  test('a successful sign-in still forwards the identity token', async () => {
    mockSignInResult = SUCCESS;
    const handlers = makeHandlers();
    await pressGoogle(handlers);
    expect(handlers.onSSOSuccess).toHaveBeenCalledWith('google', 'tok', expect.any(Object));
    expect(handlers.onSSOError).not.toHaveBeenCalled();
  });
});

// A provider rejection with no `.code` used to fall through to `.message`,
// putting a locale- and OS-dependent NSError-style sentence into analytics --
// every phrasing becomes a distinct Firebase param value, making provider
// errors uncountable. It must fall to the ANALYTICS_REASON enum instead.
describe('Google sign-in provider error with no error code', () => {
  afterEach(() => { mockSignInRejection = undefined; });

  test('reports the PROVIDER_ERROR enum, not the raw message sentence', async () => {
    mockSignInRejection = new Error('com.google.android.gms.common.api.ApiException: 7: ');
    const handlers = makeHandlers();
    await pressGoogle(handlers);

    expect(handlers.onProcessEnded).toHaveBeenCalledWith(
      expect.objectContaining({ status: ANALYTICS_STATUS.FAILURE, error: ANALYTICS_REASON.PROVIDER_ERROR })
    );
    // Still surfaced to the developer, just not through analytics.
    expect(handlers.onSSOError).toHaveBeenCalledWith(mockSignInRejection);
  });
});
