import React from 'react';
import renderer, { act } from 'react-test-renderer';
import styles from '../Styles';
import themeWhite from '../ThemeWhite';
import themeBlack from '../ThemeBlack';
import { GlobalStateContext, DispatchContext, reducer, DEFAULT_STATE } from '../StateManager';
import { AuthPage } from '../AuthPage';
import { SSOButtons, OrDivider } from '../SSOButtons';
import SSOErrorBanner from '../SSOErrorBanner';
import { AUTH_MODE } from '../AuthConstants';

// The SSO block originally carried the Figma frame width (337) as a literal
// `width`. A fixed width does not negotiate with the parent, so on any screen
// narrower than 411dp -- which is most phones, including the Galaxy S23 at
// 360dp -- the buttons overhung the right edge while the email inputs beside
// them (which declare no width) sat at the correct gutter.
//
// These assert the *absence* of a fixed width rather than a specific layout:
// the bug is re-introduced the moment a pixel measurement is copied out of
// Figma into either rule, whatever value it happens to have.
describe('SSO layout is screen-width independent', () => {
  const stretchedRules = [
    ['ssoSection', styles.ssoSection],
    ['ssoErrorBanner', styles.ssoErrorBanner],
  ];

  it.each(stretchedRules)('%s declares no fixed width', (name, rule) => {
    expect(rule).toBeDefined();
    expect(rule.width).toBeUndefined();
  });

  it.each(stretchedRules)('%s stretches to its parent', (name, rule) => {
    expect(rule.alignSelf).toBe('stretch');
  });

  // The buttons themselves are percentage-based, so they inherit whatever
  // width the stretched section resolves to. '100%' is fine here; a number
  // would not be.
  it('ssoButton width is relative, not absolute', () => {
    expect(typeof styles.ssoButton.width).toBe('string');
  });
});

// styles.ssoButton/orDividerLine/orDividerText/ssoErrorBanner* no longer carry
// color literals -- SSOButtons.js/SSOErrorBanner.js resolve those from a
// `theme` prop handed down by AuthPage (ThemeWhite.js/ThemeBlack.js supply
// the values) rather than from Styles.js.
describe('SSO colors are not hardcoded in Styles.js', () => {
  it('Styles.js no longer hardcodes sso colors', () => {
    expect(styles.ssoButton.backgroundColor).toBeUndefined();
    expect(styles.ssoButton.borderColor).toBeUndefined();
    expect(styles.ssoButtonText.color).toBeUndefined();
    expect(styles.orDividerLine.backgroundColor).toBeUndefined();
    expect(styles.orDividerText.color).toBeUndefined();
    expect(styles.ssoErrorBanner.backgroundColor).toBeUndefined();
    expect(styles.ssoErrorBanner.borderColor).toBeUndefined();
    expect(styles.ssoErrorBannerText.color).toBeUndefined();
  });
});

// The auth screen (AuthPage.js) is intentionally light-only: it matches a
// single Figma design and the SSO provider marks (Google's full-color G,
// Apple's black logo) require a light surface. This must hold no matter what
// the app's global theme setting is -- ThemeWhite.js/ThemeBlack.js both still
// carry sso* tokens (symmetric and harmless), but AuthPage always resolves
// theme via a fixed 'white' constant, never via the app's themeStr.
describe('the auth screen ignores the app theme setting', () => {
  // Mirrors TestContextWrapper, but lets the initial themeStr be overridden
  // so the same subtree can be mounted under both app theme settings.
  const ThemedWrapper = ({ themeStr, children }) => {
    const [globalState, dispatch] = React.useReducer(reducer, { ...DEFAULT_STATE, themeStr });
    globalState.theme = {};
    return (
      <DispatchContext.Provider value={dispatch}>
        <GlobalStateContext.Provider value={globalState}>
          {children}
        </GlobalStateContext.Provider>
      </DispatchContext.Provider>
    );
  };

  const renderAuthPage = (themeStr) => {
    let instance;
    act(() => {
      instance = renderer.create(
        <ThemedWrapper themeStr={themeStr}>
          <AuthPage
            authMode={AUTH_MODE.LOGIN}
            close={() => {}}
            showToast={() => {}}
            openLogin={() => {}}
            openRegister={() => {}}
            openUri={() => {}}
          />
        </ThemedWrapper>
      );
    });
    return instance;
  };

  it.each(['white', 'black'])('SSOButtons/OrDivider/SSOErrorBanner always get the light theme when the app theme setting is %s', (themeStr) => {
    const instance = renderAuthPage(themeStr);
    try {
      expect(instance.root.findByType(SSOButtons).props.theme).toBe(themeWhite);
      expect(instance.root.findByType(OrDivider).props.theme).toBe(themeWhite);
      expect(instance.root.findByType(SSOErrorBanner).props.theme).toBe(themeWhite);
    } finally {
      act(() => { instance.unmount(); });
    }
  });

  it('renders identical SSO colors regardless of the app theme setting', () => {
    const whiteInstance = renderAuthPage('white');
    const blackInstance = renderAuthPage('black');
    try {
      expect(blackInstance.root.findByType(OrDivider).props.theme)
        .toEqual(whiteInstance.root.findByType(OrDivider).props.theme);
      expect(blackInstance.root.findByType(SSOButtons).props.theme)
        .toEqual(whiteInstance.root.findByType(SSOButtons).props.theme);
    } finally {
      act(() => { whiteInstance.unmount(); });
      act(() => { blackInstance.unmount(); });
    }
  });
});
