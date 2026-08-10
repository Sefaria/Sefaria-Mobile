import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Platform } from 'react-native';
import themeWhite from '../ThemeWhite';
import strings from '../LocalizedStrings';
import { GlobalStateContext, DispatchContext, DEFAULT_STATE } from '../StateManager';
import { SSOButtons } from '../SSOButtons';
import { AUTH_MODE } from '../AuthConstants';

// Apple sign-in is hidden on Android: the Android path redirects to mobile web
// and cannot bring the user back into the app authenticated, so the entry point
// is a dead end there. See the comment on `showApple` in SSOButtons.js. iOS,
// which uses the native SDK, must keep showing it -- these assert both halves,
// because hiding it everywhere would silently break the platform that works.
describe('Apple sign-in visibility by platform', () => {
  const noop = () => {};

  const renderOn = (os, authMode = AUTH_MODE.LOGIN) => {
    const original = Platform.OS;
    Platform.OS = os;
    let instance;
    try {
      act(() => {
        instance = renderer.create(
          <DispatchContext.Provider value={noop}>
            <GlobalStateContext.Provider value={DEFAULT_STATE}>
              <SSOButtons
                authMode={authMode}
                onSSOSuccess={noop}
                onSSOError={noop}
                onMethodChosen={noop}
                onProcessStarted={noop}
                onProcessEnded={noop}
                theme={themeWhite}
              />
            </GlobalStateContext.Provider>
          </DispatchContext.Provider>
        );
      });
      return JSON.stringify(instance.toJSON());
    } finally {
      Platform.OS = original;
      if (instance) { act(() => { instance.unmount(); }); }
    }
  };

  it.each([AUTH_MODE.LOGIN, AUTH_MODE.REGISTER])('hides Apple on Android in %s mode', (authMode) => {
    const tree = renderOn('android', authMode);
    expect(tree).toContain(strings.continueWithGoogle);
    expect(tree).not.toContain(strings.continueWithApple);
  });

  it('still shows Apple on iOS', () => {
    const tree = renderOn('ios');
    expect(tree).toContain(strings.continueWithGoogle);
    expect(tree).toContain(strings.continueWithApple);
  });
});
