import styles from '../Styles';

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
