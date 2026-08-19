import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';
import TestContextWrapper from '../TestContextWrapper';
import { SSOButtons } from '../SSOButtons';
import themeWhite from '../ThemeWhite';
import { AUTH_MODE } from '../AuthConstants';

// The native Google SDK caches the last authorized account and silently
// re-signs the user in with it unless that cache is cleared first via
// signOut() before signIn(). That clear used to be gated behind
// `authMode === AUTH_MODE.REGISTER`, so on the LOGIN path the account
// chooser never appeared: a user with two Google accounts on the device was
// always re-authorized with whichever one was last used, with no way to pick
// the other. These assert signOut() runs on both LOGIN and REGISTER so that
// register-only gate can't be reintroduced.
const SUCCESS = { type: 'success', data: { idToken: 'tok', user: {} } };

let mockSignInResult;

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signOut: jest.fn(() => Promise.resolve()),
    signIn: jest.fn(() => Promise.resolve(mockSignInResult)),
  },
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' },
}));

const { GoogleSignin } = require('@react-native-google-signin/google-signin');

const pressGoogle = async (authMode, handlers) => {
  let instance;
  await act(async () => {
    instance = renderer.create(
      <TestContextWrapper child={SSOButtons} childProps={{ authMode, theme: themeWhite, ...handlers }} />
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

describe('Google sign-in cached-account clearing', () => {
  beforeEach(() => {
    mockSignInResult = SUCCESS;
    GoogleSignin.signOut.mockClear();
  });

  test('clears the cached account on LOGIN so the chooser appears', async () => {
    await pressGoogle(AUTH_MODE.LOGIN, makeHandlers());
    expect(GoogleSignin.signOut).toHaveBeenCalledTimes(1);
  });

  test('still clears the cached account on REGISTER', async () => {
    await pressGoogle(AUTH_MODE.REGISTER, makeHandlers());
    expect(GoogleSignin.signOut).toHaveBeenCalledTimes(1);
  });

  test('signOut runs before signIn on the LOGIN path', async () => {
    const callOrder = [];
    GoogleSignin.signOut.mockImplementation(() => { callOrder.push('signOut'); return Promise.resolve(); });
    GoogleSignin.signIn.mockImplementation(() => { callOrder.push('signIn'); return Promise.resolve(mockSignInResult); });
    await pressGoogle(AUTH_MODE.LOGIN, makeHandlers());
    expect(callOrder).toEqual(['signOut', 'signIn']);
  });
});
