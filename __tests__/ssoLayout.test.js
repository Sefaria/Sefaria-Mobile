import styles from '../Styles';
import themeWhite from '../ThemeWhite';
import themeBlack from '../ThemeBlack';

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
// color literals -- SSOButtons.js/SSOErrorBanner.js resolve those from
// theme.sso* (ThemeWhite.js/ThemeBlack.js) so dark mode isn't stuck with the
// light theme's white buttons and near-invisible divider.
describe('SSO colors are theme-driven', () => {
  it('divider and error banner colors differ between themes', () => {
    expect(themeBlack.ssoDividerLine.backgroundColor).not.toBe(themeWhite.ssoDividerLine.backgroundColor);
    expect(themeBlack.ssoDividerText.color).not.toBe(themeWhite.ssoDividerText.color);
    expect(themeBlack.ssoErrorBannerBackground.backgroundColor).not.toBe(themeWhite.ssoErrorBannerBackground.backgroundColor);
  });

  // Google's full-color "G" mark and the solid-black Apple mark both need a
  // light surface (see ThemeBlack.js), so the button itself intentionally
  // does NOT flip with the theme -- only its color now lives in one place.
  it('button background/border/text are pinned the same in both themes', () => {
    expect(themeBlack.ssoButtonBackground).toEqual(themeWhite.ssoButtonBackground);
    expect(themeBlack.ssoButtonBorder).toEqual(themeWhite.ssoButtonBorder);
    expect(themeBlack.ssoButtonText).toEqual(themeWhite.ssoButtonText);
  });

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
