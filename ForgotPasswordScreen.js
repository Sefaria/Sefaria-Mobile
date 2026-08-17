'use strict';

// The AUTH_MODE.FORGOT_PASSWORD screen, extracted out of AuthPage.js. Its
// analytics (flow/attempt bookkeeping, ssoError) and SSO token handlers are
// NOT owned here -- they're the main screen's useAuthAnalytics instance,
// passed down as props, so a provider tap from this screen's banner reports
// into the SAME flow_id/attempt_id funnel instead of minting a second one.

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { RainbowBar, CircleCloseButton, SystemButton } from './Misc';
import Sefaria from './sefaria';
import strings from './LocalizedStrings';
import styles from './Styles';
import { AuthTextInput } from './AuthTextInput';
import SSOErrorBanner from './SSOErrorBanner';
import { createGoogleSignInHandler, createAppleSignInHandler } from './SSOButtons';
import { ssoErrorWithCode } from './authErrorMessages';
import { AUTH_MODE, SSO_PROVIDER, AUTH_ERROR_CODE } from './AuthConstants';

// The forgot-password screen's render states. FORM is the pristine state; ERROR
// is the form plus an error banner, covering both a network/generic failure and
// an sso_only_account result (they render the same way, just different banner
// content); SENT replaces the form entirely.
const FORGOT_PASSWORD_VIEW = {
  FORM: 'form',
  SENT: 'sent',
  ERROR: 'error',
};

// No dedicated "unknown email" case: a non-existent email still reports
// success, like web. SSO-only accounts are the exception -- the backend
// returns 401 + `_auth.providers`, so those ARE enumerable (existence + provider).
const forgotPasswordViewForResult = (result) => (
  result.success ? FORGOT_PASSWORD_VIEW.SENT : FORGOT_PASSWORD_VIEW.ERROR
);

// Builds the ERROR view's banner content, highest precedence first: a live
// ssoError from tapping one of this banner's own provider links; then an
// sso_only_account result, one message+link row per linked provider (Apple
// excluded on Android, same as SSOButtons' own showApple); else the generic
// message with no link.
const forgotPasswordBannerError = (auth, ssoError, { showAppleLink, disabled, onGoogleLink, onAppleLink }) => {
  const rows = [];
  if (auth?.code === AUTH_ERROR_CODE.SSO_ONLY_ACCOUNT) {
    const providers = new Set(Array.isArray(auth.providers) ? auth.providers : []);
    if (providers.has(SSO_PROVIDER.GOOGLE)) {
      rows.push({ message: strings.ssoEmailExistsGoogle, linkText: strings.continueWithGoogle, onPress: onGoogleLink, disabled });
    }
    if (providers.has(SSO_PROVIDER.APPLE)) {
      // Apple-only accounts still get named on Android even though there's no
      // actionable link there (see AppleSignInButton's showApple comment in
      // SSOButtons.js) -- a plain message row beats falling through to the
      // misleading generic "Something went wrong" message below.
      rows.push(showAppleLink
        ? { message: strings.ssoEmailExistsApple, linkText: strings.continueWithApple, onPress: onAppleLink, disabled }
        : { message: strings.ssoEmailExistsApple });
    }
  }
  if (ssoError) {
    // A live error from tapping one of this banner's own provider links --
    // surface it above any provider rows instead of replacing them, so a
    // transient failure doesn't strand the user with no retry path when a
    // provider link was the only way in.
    return { rows: [{ message: ssoError }, ...rows] };
  }
  if (rows.length) { return { rows }; }
  // Route through the same code -> message mapping the login/register banner
  // uses, so e.g. a network failure shows the network string here too instead
  // of always collapsing to the bare generic message.
  return { message: ssoErrorWithCode(auth?.code) };
};

const ForgotPasswordScreen = ({
  theme,
  themeStr,
  isHeb,
  close,
  openLogin,
  fireMethodChosen,
  fireProcessStarted,
  fireProcessEnded,
  handleSSOTokenReceived,
  handleSSOError,
  ssoError,
  setSsoError,
}) => {
  const placeholderTextColor = themeStr === "black" ? "#BBB" : "#777";

  // Local to this component -- separate from AuthPage's login/register form.
  // This screen is not part of the analytics auth_* FLOW (useAuthAnalytics
  // skips the flow bookends for AUTH_MODE.FORGOT_PASSWORD), though a provider
  // tap from this screen's banner still emits the normal
  // auth_method_chosen/auth_process_started/auth_process_ended attempt events.
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState(null);
  const [forgotPasswordView, setForgotPasswordView] = useState(FORGOT_PASSWORD_VIEW.FORM);
  const [forgotPasswordIsLoading, setForgotPasswordIsLoading] = useState(false);
  // Populated when requestPasswordReset returns sso_only_account; read by
  // forgotPasswordBannerError above.
  const [forgotPasswordSsoAuth, setForgotPasswordSsoAuth] = useState(null);
  // Disables the banner's provider link(s) for the duration of a tap so a
  // second tap can't fire a second sign-in.
  const [forgotPasswordSsoBusy, setForgotPasswordSsoBusy] = useState(false);

  // Give the banner's provider links the same native sign-in SSOButtons'
  // buttons trigger, routed through the same handlers as every other SSO
  // entry point on this page. setLoadingProvider is a no-op here: nothing on
  // this banner renders per-provider loading feedback, unlike SSOButtons'
  // own isPressed styling, so there's no per-provider state worth keeping.
  const triggerGoogleSignIn = createGoogleSignInHandler({
    authMode: AUTH_MODE.FORGOT_PASSWORD,
    setIsLoading: setForgotPasswordSsoBusy,
    setLoadingProvider: () => {},
    onSSOSuccess: handleSSOTokenReceived,
    onSSOError: handleSSOError,
    onMethodChosen: fireMethodChosen,
    onProcessStarted: fireProcessStarted,
    onProcessEnded: fireProcessEnded,
  });
  const triggerAppleSignIn = createAppleSignInHandler({
    setIsLoading: setForgotPasswordSsoBusy,
    setLoadingProvider: () => {},
    onSSOSuccess: handleSSOTokenReceived,
    onSSOError: handleSSOError,
    onMethodChosen: fireMethodChosen,
    onProcessStarted: fireProcessStarted,
    onProcessEnded: fireProcessEnded,
  });

  const handleForgotPasswordSubmit = async () => {
    // Empty field: stay inert rather than POST a null email. No dedicated
    // "enter an email" copy exists yet, so this just doesn't submit.
    if (!forgotPasswordEmail || !forgotPasswordEmail.trim()) { return; }
    // Clear a stale live SSO error from an earlier provider-link tap, or it
    // would keep outranking this submission's own result.
    setSsoError(null);
    setForgotPasswordIsLoading(true);
    try {
      const result = await Sefaria.api.requestPasswordReset(forgotPasswordEmail);
      setForgotPasswordSsoAuth(result.success ? null : result);
      setForgotPasswordView(forgotPasswordViewForResult(result));
    } catch (error) {
      // requestPasswordReset is documented as classify-don't-throw, but an
      // unexpected throw here would otherwise leave the form pristine with no
      // feedback and an unhandled rejection.
      console.error('Unexpected error requesting password reset:', error);
      setForgotPasswordSsoAuth(null);
      setForgotPasswordView(FORGOT_PASSWORD_VIEW.ERROR);
    } finally {
      setForgotPasswordIsLoading(false);
    }
  };

  const forgotPasswordBanner = forgotPasswordView === FORGOT_PASSWORD_VIEW.ERROR
    ? forgotPasswordBannerError(forgotPasswordSsoAuth, ssoError, {
        // Apple has no native Android SDK; mirrors SSOButtons' own showApple.
        showAppleLink: Platform.OS === 'ios',
        disabled: forgotPasswordSsoBusy,
        onGoogleLink: triggerGoogleSignIn,
        onAppleLink: triggerAppleSignIn,
      })
    : null;

  // The form stays on screen through both FORM and ERROR states (ERROR just
  // adds a banner above the email input). SENT replaces it entirely: title +
  // body only, no button, no "Back to login".
  const forgotPasswordContent = (
    <ScrollView style={[{flex:1, alignSelf: "stretch"}, theme.mainTextPanel]} contentContainerStyle={{alignItems: "center", paddingBottom: 50}} keyboardShouldPersistTaps='handled'>
      <RainbowBar />
      <View style={{ flex: 1, alignSelf: "stretch", alignItems: "flex-end", marginHorizontal: 10}}>
        <CircleCloseButton onPress={close} themeStr={themeStr} />
      </View>
      <Text style={[styles.pageTitle, theme.text]}>
        {forgotPasswordView === FORGOT_PASSWORD_VIEW.SENT ? strings.resetLinkSentTitle : strings.forgotPasswordTitle}
      </Text>
      <View style={{flex: 1, alignSelf: "stretch", marginHorizontal: 37}}>
        {forgotPasswordView === FORGOT_PASSWORD_VIEW.SENT ? (
          <Text style={[theme.secondaryText, styles.textCenter, isHeb ? styles.heInt : styles.enInt]}>
            {strings.resetLinkSentBody}
          </Text>
        ) : (
          <View>
            <SSOErrorBanner error={forgotPasswordBanner} theme={theme} />
            <AuthTextInput
              placeholder={strings.forgotPasswordEmailPlaceholder}
              autoCapitalize={'none'}
              placeholderTextColor={placeholderTextColor}
              onChangeText={setForgotPasswordEmail}
              theme={theme}
            />
            <SystemButton
              isLoading={forgotPasswordIsLoading}
              onPress={handleForgotPasswordSubmit}
              text={strings.sendResetLink}
              isHeb={isHeb}
              isBlue
              theme={theme}
            />
            <TouchableOpacity onPress={openLogin} style={{alignItems: 'center', marginTop: 15}}>
              <Text style={[theme.text, styles.underline, isHeb ? styles.heInt : styles.enInt]}>{strings.backToLogin}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  )

  return forgotPasswordContent;
};

ForgotPasswordScreen.propTypes = {
  theme: PropTypes.object.isRequired,
  themeStr: PropTypes.string.isRequired,
  isHeb: PropTypes.bool.isRequired,
  close: PropTypes.func.isRequired,
  openLogin: PropTypes.func.isRequired,
  fireMethodChosen: PropTypes.func.isRequired,
  fireProcessStarted: PropTypes.func.isRequired,
  fireProcessEnded: PropTypes.func.isRequired,
  handleSSOTokenReceived: PropTypes.func.isRequired,
  handleSSOError: PropTypes.func.isRequired,
  ssoError: PropTypes.string,
  setSsoError: PropTypes.func.isRequired,
};

export { ForgotPasswordScreen, FORGOT_PASSWORD_VIEW, forgotPasswordViewForResult, forgotPasswordBannerError };
