import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Platform, TouchableOpacity } from 'react-native';
import TestContextWrapper from '../TestContextWrapper';
import { SSOButtons } from '../SSOButtons';
import themeWhite from '../ThemeWhite';
import { AUTH_MODE, ANALYTICS_STATUS, ANALYTICS_REASON } from '../AuthConstants';

// Parallel of ssoGoogleCancel.test.js for Apple, whose contract differs on both
// ends:
//
//   * Cancelling REJECTS with an error whose `code` is AppleError.CANCELED
//     ('1001') -- unlike Google v13, which RESOLVES with { type: 'cancelled' }.
//     So the cancel has to be recognised in the catch block, and mistaking it
//     for a provider error would show the user an error banner for a deliberate
//     dismissal and log it into the funnel as a provider failure.
//   * Apple returns email/fullName only on the user's FIRST authorization. On
//     every later sign-in they are null and the email comes from the verified
//     ID token claim server-side, so a null email must not stop the token from
//     being forwarded.
//
// Apple is hidden on Android (see ssoAppleAndroid.test.js), so Platform.OS is
// pinned to 'ios' here or there is no button to press at all.
const CANCELED_CODE = '1001';

let mockPerformRequest;

jest.mock('@invertase/react-native-apple-authentication', () => ({
  __esModule: true,
  default: {
    isSupported: true,
    Operation: { LOGIN: 'LOGIN' },
    Scope: { EMAIL: 'EMAIL', FULL_NAME: 'FULL_NAME' },
    Error: { CANCELED: '1001' },
    performRequest: jest.fn(() => mockPerformRequest()),
  },
}));

const pressApple = async (handlers) => {
  const originalOS = Platform.OS;
  Platform.OS = 'ios';
  try {
    let instance;
    await act(async () => {
      instance = renderer.create(
        <TestContextWrapper child={SSOButtons} childProps={{ authMode: AUTH_MODE.LOGIN, theme: themeWhite, ...handlers }} />
      );
    });
    // [0] is Google, [1] is Apple -- see SSOButtons' render order.
    const appleButton = instance.root.findAllByType(TouchableOpacity)[1];
    await act(async () => { await appleButton.props.onPress(); });
    await act(async () => { instance.unmount(); });
  } finally {
    Platform.OS = originalOS;
  }
};

const makeHandlers = () => ({
  onSSOSuccess: jest.fn(),
  onSSOError: jest.fn(),
  onMethodChosen: jest.fn(),
  onProcessStarted: jest.fn(),
  onProcessEnded: jest.fn(),
});

describe('Apple sign-in cancellation', () => {
  test('a cancelled sign-in raises no error', async () => {
    mockPerformRequest = () => Promise.reject(Object.assign(new Error('The user canceled the authorization attempt'), { code: CANCELED_CODE }));
    const handlers = makeHandlers();
    await pressApple(handlers);
    expect(handlers.onSSOError).not.toHaveBeenCalled();
  });

  test('a cancelled sign-in is reported as cancelled, not a provider error', async () => {
    mockPerformRequest = () => Promise.reject(Object.assign(new Error('The user canceled the authorization attempt'), { code: CANCELED_CODE }));
    const handlers = makeHandlers();
    await pressApple(handlers);
    // The provider must be passed explicitly (not left to fall back to
    // currentMethodRef), so a focus on some other field mid-flow can't
    // misattribute this event -- see Fix 5.
    expect(handlers.onProcessEnded).toHaveBeenCalledWith(
      expect.objectContaining({ status: ANALYTICS_STATUS.FAILURE, error: ANALYTICS_REASON.CANCELLED }),
      'apple'
    );
  });

  test('a genuine provider failure is still reported as one', async () => {
    mockPerformRequest = () => Promise.reject(Object.assign(new Error('unknown'), { code: '1000' }));
    const handlers = makeHandlers();
    await pressApple(handlers);
    expect(handlers.onSSOError).toHaveBeenCalled();
    expect(handlers.onProcessEnded).toHaveBeenCalledWith(
      // The raw SDK code (`error.code`) is what reaches analytics here, not
      // the ANALYTICS_REASON.PROVIDER_ERROR fallback -- that's only used when
      // there's no raw code/message to report.
      expect.objectContaining({ status: ANALYTICS_STATUS.FAILURE, error: '1000' }),
      'apple'
    );
  });

  test('a successful sign-in forwards the identity token and the profile', async () => {
    mockPerformRequest = () => Promise.resolve({
      identityToken: 'apple-tok',
      email: 'first@privaterelay.appleid.com',
      fullName: { givenName: 'Bob', familyName: 'Bobson' },
    });
    const handlers = makeHandlers();
    await pressApple(handlers);
    expect(handlers.onSSOSuccess).toHaveBeenCalledWith('apple', 'apple-tok', {
      email: 'first@privaterelay.appleid.com',
      firstName: 'Bob',
      lastName: 'Bobson',
    });
    expect(handlers.onSSOError).not.toHaveBeenCalled();
  });

  // Apple withholds email/fullName after the first authorization, so this is
  // what every returning user's sign-in looks like. The token must still be
  // forwarded -- the email is recovered from the ID token claim server-side.
  test('a repeat sign-in with no email or name still forwards the token', async () => {
    mockPerformRequest = () => Promise.resolve({ identityToken: 'apple-tok', email: null, fullName: null });
    const handlers = makeHandlers();
    await pressApple(handlers);
    expect(handlers.onSSOSuccess).toHaveBeenCalledWith('apple', 'apple-tok', {
      email: null,
      firstName: undefined,
      lastName: undefined,
    });
    expect(handlers.onSSOError).not.toHaveBeenCalled();
  });

  test('a response with no identity token is a provider error, not a silent no-op', async () => {
    mockPerformRequest = () => Promise.resolve({ identityToken: null, email: null, fullName: null });
    const handlers = makeHandlers();
    await pressApple(handlers);
    expect(handlers.onSSOSuccess).not.toHaveBeenCalled();
    expect(handlers.onProcessEnded).toHaveBeenCalledWith(
      // A locale/OS-dependent sentence would be an uncountable analytics
      // value; this must stay the closed enum member instead (see Fix 1).
      expect.objectContaining({ status: ANALYTICS_STATUS.FAILURE, error: ANALYTICS_REASON.INVALID_RESPONSE }),
      'apple'
    );
  });
});
