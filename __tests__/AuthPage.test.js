import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { SystemButton } from '../Misc';
import TestContextWrapper from '../TestContextWrapper';
import { AuthPage, AuthTextInput, ssoCollisionMessage } from '../AuthPage';
import strings from '../LocalizedStrings';


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

// AuthPage's flow_started useEffect fires an unawaited trackEvent(...) call,
// which chains through analytics/enrichments.js's real NetInfo/AsyncStorage
// reads. Under React 19 + react-test-renderer, renderer.create() must be
// wrapped in act() so those passive effects (and any state updates they
// eventually trigger) are flushed and settled before the test's synchronous
// body continues -- otherwise they resolve on a later tick that can land
// after Jest has torn down the module registry, crashing with "Can't access
// .root on unmounted test renderer" / "trying to `import` a file after the
// Jest environment has been torn down". Each instance is also unmounted in
// afterEach so no test's tree (and its effects) leaks into the next test or
// past the end of the file.
let currentInstance;

afterEach(() => {
  if (currentInstance) {
    act(() => { currentInstance.unmount(); });
    currentInstance = null;
  }
});

describe('login', () => {

  test('num fields', () => {
    act(() => { currentInstance = renderer.create(<AuthPageWrapper authMode={'login'} />); });
    const inputs = currentInstance.root.findAllByType(AuthTextInput);
    expect(inputs.length).toBe(2);
  });
  test('fields sent onSubmit', async () => {
    Sefaria.api.authenticate = jest.fn();
    act(() => { currentInstance = renderer.create(<AuthPageWrapper authMode={'login'} />); });
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
    expect(Sefaria.api.authenticate.mock.calls[0][1]).toBe('login');
  });
});

describe('register', () => {
  test('num fields', () => {
    act(() => { currentInstance = renderer.create(<AuthPageWrapper authMode={'register'} />); });
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
