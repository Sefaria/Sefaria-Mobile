'use strict'

// Design tokens for SSO (Google/Apple) sign-in UI, sourced from the Figma spec
// (docs/superpowers/specs/2026-07-21-mobile-sso-design.md, section 2).
// Every SSO color, spacing, font size, and dimension should reference a named
// constant here rather than a hardcoded literal in Styles.js / SSOButtons.js.

// SSO colors (button background/border/text, divider line/text, error banner)
// now live as theme tokens in ThemeWhite.js/ThemeBlack.js — SSOColors held
// them all, so there is nothing color-related left to export here.

export const SSOSpacing = {
  buttonGap: 16,      // vertical gap between Google and Apple buttons (Figma --global/dimension-200)
  sectionGap: 24,     // gap between SSO buttons section and the "or" divider
  buttonPaddingH: 24, // horizontal padding inside a button (--sds-size-space-600)
  iconTextGap: 8,     // gap between icon and label (--sds-size-space-200)
  dividerLabelGap: 16,// horizontal margin around the "or" label
  titleGap: 24,       // gap between the page title (Log in / Sign up) and the first SSO button
};

export const SSODimensions = {
  buttonHeight: 51,
  buttonBorderWidth: 1.5, // --sds-size-stroke-border
  buttonRadius: 4,        // --space-1
  iconSize: 24,
  // No fixed container width: see __tests__/ssoLayout.test.js for why.
};

export const SSOTypography = {
  buttonTextSize: 16,
  buttonFontWeight: '600',
  dividerTextSize: 14,
};
