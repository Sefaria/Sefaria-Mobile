'use strict';

import React, { useState, useContext } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import Config from 'react-native-config';
import strings from './LocalizedStrings';
import styles from './Styles';
import { GlobalStateContext } from './StateManager';
import Sefaria from './sefaria';
import { SSO_PROVIDER, AUTH_MODE, ANALYTICS_STATUS, ANALYTICS_REASON } from './AuthConstants';

// Apple has no native Android SDK; per the Figma spec Android falls back to a
// mobile-web redirect. This reads the same host api.js uses (Sefaria.api._baseHost)
// so the two can never diverge.
// NOTE: completing the round-trip back into the app requires the backend to
// deep-link back (see DeepLinkRouter.js) — otherwise the user can get stuck in
// the browser (a known limitation called out in the Figma spec).
const appleAndroidRedirectUrl = () => `${Sefaria.api._baseHost}accounts/apple/login/`;

// Extracted out of GoogleSignInButton so the forgot-password banner's
// "Continue with Google" link (see AuthPage.js) can trigger the same native
// sign-in without rendering the button UI. Takes setIsLoading/setLoadingProvider
// as plain setters so any caller can supply its own loading state.
const createGoogleSignInHandler = ({ authMode, setIsLoading, setLoadingProvider, onSSOSuccess, onSSOError, onMethodChosen, onProcessStarted, onProcessEnded }) => async () => {
    // Fired at the very top of the handler, before any async work, so it
    // captures the tap itself rather than however long setup/network takes.
    onMethodChosen(SSO_PROVIDER.GOOGLE);
    let GoogleSignin, statusCodes;
    try {
      ({ GoogleSignin, statusCodes } = require('@react-native-google-signin/google-signin'));
    } catch (e) {
      onProcessEnded({ status: ANALYTICS_STATUS.FAILURE, error: ANALYTICS_REASON.MODULE_UNAVAILABLE }, SSO_PROVIDER.GOOGLE);
      const rebuildCmd = Platform.OS === 'ios' ? 'npx react-native run-ios' : 'npx react-native run-android';
      onSSOError(new Error(`Google Sign-In native module not available. Rebuild the app with: ${rebuildCmd}`));
      return;
    }
    try {
      setLoadingProvider(SSO_PROVIDER.GOOGLE);
      setIsLoading(true);
      GoogleSignin.configure({
        iosClientId: Config.GOOGLE_SSO_IOS_CLIENT_ID,
        webClientId: Config.GOOGLE_SSO_CLIENT_ID,
      });
      await GoogleSignin.hasPlayServices();
      // Pre-flight check succeeded -- this is the "clicked -> provider sheet
      // shown" gap the spec wants measured, so process_started fires here.
      onProcessStarted();
      // The native SDK remembers the last authorized account and would sign
      // the user straight back in with it, skipping the account chooser
      // entirely. That's wrong on both paths: on sign-up someone creating an
      // account needs to choose which Google account it belongs to rather
      // than silently inherit whoever signed in last on this device, and on
      // login it means a user with more than one Google account has no way
      // to pick the other one -- they're stuck re-authorizing whichever
      // account the SDK cached, however many times they tap the button.
      // Clearing the cached account first is what forces the chooser to
      // appear. Best-effort — nothing to clear on a first run.
      try {
        await GoogleSignin.signOut();
      } catch (e) {}
      const response = await GoogleSignin.signIn();
      // Since v13 a cancellation RESOLVES as { type: 'cancelled', data: null }
      // rather than rejecting with SIGN_IN_CANCELLED, so it never reaches the
      // catch below. It has to be recognised here or `data?.idToken` is
      // undefined and a dismissed picker -- the normal outcome on a device with
      // no Google account, e.g. every BrowserStack device -- reaches the user as
      // a provider error and lands in the funnel as one.
      if (response?.type === 'cancelled') {
        onProcessEnded({ status: ANALYTICS_STATUS.FAILURE, error: ANALYTICS_REASON.CANCELLED }, SSO_PROVIDER.GOOGLE);
        return;
      }
      const idToken = response.data?.idToken;
      if (idToken) {
        try {
          await onSSOSuccess(SSO_PROVIDER.GOOGLE, idToken, {
            email: response.data?.user?.email,
            firstName: response.data?.user?.givenName,
            lastName: response.data?.user?.familyName,
          });
        } catch (postSuccessError) {
          // The sign-in itself already succeeded and was reported as such
          // (onSSOSuccess fires process_ended SUCCESS before doing anything
          // else) -- a throw from its post-login chain (dispatch/sync/close)
          // must not fall into the catch below and get reported as a provider
          // failure on top of an already-reported success.
          console.error('Post sign-in error after Google SSO success:', postSuccessError);
        }
      } else {
        // Reached when the SDK signs in but returns no token, which on Android
        // means webClientId was empty at configure() time: Utils.java only calls
        // requestIdToken(webClientId) when it is non-empty, so the flow succeeds
        // and getIdToken() is null. Surface it instead of failing silently.
        onProcessEnded({ status: ANALYTICS_STATUS.FAILURE, error: ANALYTICS_REASON.INVALID_RESPONSE }, SSO_PROVIDER.GOOGLE);
        onSSOError(new Error('Google sign-in did not return an identity token.'));
      }
    } catch (error) {
      if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
        // `error` must stay a low-cardinality, groupable value: prefer the raw
        // SDK *code*, falling back to ANALYTICS_REASON.PROVIDER_ERROR when
        // there isn't one. `error.message` is deliberately excluded -- Apple/
        // Google SDK rejections frequently have no `.code`, and their `.message`
        // is a locale- and OS-dependent NSError sentence, so every phrasing
        // becomes a distinct Firebase param value and provider errors become
        // uncountable. The message text itself still reaches the developer via
        // onSSOError below (console.log + the __DEV__ banner in AuthPage), it
        // just doesn't leak into analytics.
        onProcessEnded({ status: ANALYTICS_STATUS.FAILURE, error: error?.code || ANALYTICS_REASON.PROVIDER_ERROR }, SSO_PROVIDER.GOOGLE);
        onSSOError(error);
      } else {
        // Cancel is intentionally swallowed from the user-facing error banner
        // (unchanged behavior) but still needs to be tracked as a failure.
        onProcessEnded({ status: ANALYTICS_STATUS.FAILURE, error: ANALYTICS_REASON.CANCELLED }, SSO_PROVIDER.GOOGLE);
      }
    } finally {
      setIsLoading(false);
      setLoadingProvider(null);
    }
  };

const GoogleSignInButton = ({ authMode, isLoading, loadingProvider, setIsLoading, setLoadingProvider, onSSOSuccess, onSSOError, onMethodChosen, onProcessStarted, onProcessEnded, isHeb, theme }) => {
  const handleGoogleSignIn = createGoogleSignInHandler({ authMode, setIsLoading, setLoadingProvider, onSSOSuccess, onSSOError, onMethodChosen, onProcessStarted, onProcessEnded });

  const isPressed = isLoading && loadingProvider === SSO_PROVIDER.GOOGLE;

  return (
    <TouchableOpacity
      style={[styles.ssoButton, theme.ssoButtonBackground, theme.ssoButtonBorder, isHeb && { flexDirection: 'row-reverse' }, isPressed && styles.ssoButtonPressed]}
      onPress={handleGoogleSignIn}
      disabled={isLoading}
      activeOpacity={0.2}
    >
      <Image source={require('./img/sso-google.png')} style={styles.ssoIcon} resizeMode="contain" />
      <Text style={[styles.ssoButtonText, theme.ssoButtonText, isHeb ? styles.heInt : styles.enInt]}>{strings.continueWithGoogle}</Text>
    </TouchableOpacity>
  );
};

// Same extraction as createGoogleSignInHandler above, for the same reason.
// The Android branch (Linking.openURL redirect) is unchanged.
const createAppleSignInHandler = ({ setIsLoading, setLoadingProvider, onSSOSuccess, onSSOError, onMethodChosen, onProcessStarted, onProcessEnded }) => async () => {
    // Fired at the very top of the handler, before any async work or the
    // iOS/Android branch, so it captures the tap itself.
    onMethodChosen(SSO_PROVIDER.APPLE);
    if (Platform.OS === 'ios') {
      let appleAuth;
      try {
        appleAuth = require('@invertase/react-native-apple-authentication').default;
      } catch (e) {
        onProcessEnded({ status: ANALYTICS_STATUS.FAILURE, error: ANALYTICS_REASON.MODULE_UNAVAILABLE }, SSO_PROVIDER.APPLE);
        onSSOError(new Error('Apple Sign-In native module not available. Rebuild the app with: npx react-native run-ios'));
        return;
      }
      if (!appleAuth.isSupported) {
        onProcessEnded({ status: ANALYTICS_STATUS.FAILURE, error: ANALYTICS_REASON.UNSUPPORTED_DEVICE }, SSO_PROVIDER.APPLE);
        onSSOError(new Error('Apple Sign-In is not supported on this device (requires a real iOS device, not a simulator)'));
        return;
      }
      // Pre-flight check (isSupported) succeeded -- this is the
      // "clicked -> provider sheet shown" gap the spec wants measured.
      onProcessStarted();
      try {
        setLoadingProvider(SSO_PROVIDER.APPLE);
        setIsLoading(true);
        const appleAuthRequestResponse = await appleAuth.performRequest({
          requestedOperation: appleAuth.Operation.LOGIN,
          requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
        });
        const { identityToken, fullName, email } = appleAuthRequestResponse;
        if (identityToken) {
          try {
            await onSSOSuccess(SSO_PROVIDER.APPLE, identityToken, {
              email,
              firstName: fullName?.givenName,
              lastName: fullName?.familyName,
            });
          } catch (postSuccessError) {
            // Same reasoning as the Google button's equivalent guard above:
            // success was already reported, so a downstream throw here must
            // not be misreported as a provider failure.
            console.error('Post sign-in error after Apple SSO success:', postSuccessError);
          }
        } else {
          // Unlike the equivalent Google branch above, nothing here calls
          // onSSOError, so this console.log is the only place a developer sees
          // this failure -- the analytics `error` field only carries the
          // low-cardinality reason enum (see the comment on the catch block
          // below), not this message.
          console.log('Apple Sign-In: performRequest resolved with no identityToken.');
          onProcessEnded({ status: ANALYTICS_STATUS.FAILURE, error: ANALYTICS_REASON.INVALID_RESPONSE }, SSO_PROVIDER.APPLE);
        }
      } catch (error) {
        if (error.code !== appleAuth.Error.CANCELED) {
          // `error` must stay a low-cardinality, groupable value: prefer the raw
          // SDK *code*, falling back to ANALYTICS_REASON.PROVIDER_ERROR when
          // there isn't one. `error.message` is deliberately excluded -- see the
          // matching comment on the Google button's catch block above.
          onProcessEnded({ status: ANALYTICS_STATUS.FAILURE, error: error?.code || ANALYTICS_REASON.PROVIDER_ERROR }, SSO_PROVIDER.APPLE);
          onSSOError(error);
        } else {
          // Cancel path: see the same comment on the Google button above.
          onProcessEnded({ status: ANALYTICS_STATUS.FAILURE, error: ANALYTICS_REASON.CANCELLED }, SSO_PROVIDER.APPLE);
        }
      } finally {
        setIsLoading(false);
        setLoadingProvider(null);
      }
    } else {
      // Apple has no native Android SDK: this is a Linking.openURL redirect out
      // of the app (see appleAndroidRedirectUrl above). Once the user leaves,
      // there is no signal back into the app tied to the actual sign-in
      // outcome, so we deliberately fire method_chosen + process_started only
      // and nothing further here. Analytics infers abandonment from a
      // flow_started with no matching flow_ended.
      onProcessStarted();
      try {
        await Linking.openURL(appleAndroidRedirectUrl());
      } catch (error) {
        onProcessEnded({ status: ANALYTICS_STATUS.FAILURE, error: ANALYTICS_REASON.PROVIDER_ERROR }, SSO_PROVIDER.APPLE);
        onSSOError(new Error('Could not open Apple sign-in. Please try again.'));
      }
    }
  };

const AppleSignInButton = ({ isLoading, loadingProvider, setIsLoading, setLoadingProvider, onSSOSuccess, onSSOError, onMethodChosen, onProcessStarted, onProcessEnded, isHeb, theme }) => {
  const handleAppleSignIn = createAppleSignInHandler({ setIsLoading, setLoadingProvider, onSSOSuccess, onSSOError, onMethodChosen, onProcessStarted, onProcessEnded });

  const isPressed = isLoading && loadingProvider === SSO_PROVIDER.APPLE;

  return (
    <TouchableOpacity
      style={[styles.ssoButton, theme.ssoButtonBackground, theme.ssoButtonBorder, isHeb && { flexDirection: 'row-reverse' }, isPressed && styles.ssoButtonPressed]}
      onPress={handleAppleSignIn}
      disabled={isLoading}
      activeOpacity={0.2}
    >
      <Image source={require('./img/sso-apple.png')} style={styles.ssoIcon} resizeMode="contain" />
      <Text style={[styles.ssoButtonText, theme.ssoButtonText, isHeb ? styles.heInt : styles.enInt]}>{strings.continueWithApple}</Text>
    </TouchableOpacity>
  );
};

const SSOButtons = ({ authMode, onSSOSuccess, onSSOError, onMethodChosen, onProcessStarted, onProcessEnded, theme }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState(null);
  const { interfaceLanguage } = useContext(GlobalStateContext);
  const isHeb = interfaceLanguage === 'hebrew';
  // TEMPORARY: Apple sign-in is hidden on Android, iOS is unaffected.
  //
  // On Android there is no native Apple SDK, so the button hands off to mobile
  // web (see AppleSignInButton's else branch). That round trip signs the user in
  // on the web session only -- there is currently no way to bring them back into
  // the app authenticated, so an Android user who originally registered with
  // Apple has no working way in and lands in a dead end. Hiding the entry point
  // is better than offering a path that cannot complete.
  //
  // Deliberately hidden, not deleted: the Android redirect path below stays in
  // place so this becomes a one-line revert once the deep-link-back is built.
  // Sizing that work is queued behind the web SSO release.
  const showApple = Platform.OS === 'ios';

  return (
    <View style={styles.ssoSection}>
      <GoogleSignInButton
        authMode={authMode}
        isLoading={isLoading}
        loadingProvider={loadingProvider}
        setIsLoading={setIsLoading}
        setLoadingProvider={setLoadingProvider}
        onSSOSuccess={onSSOSuccess}
        onSSOError={onSSOError}
        onMethodChosen={onMethodChosen}
        onProcessStarted={onProcessStarted}
        onProcessEnded={onProcessEnded}
        isHeb={isHeb}
        theme={theme}
      />
      {showApple && (
        <AppleSignInButton
          isLoading={isLoading}
          loadingProvider={loadingProvider}
          setIsLoading={setIsLoading}
          setLoadingProvider={setLoadingProvider}
          onSSOSuccess={onSSOSuccess}
          onSSOError={onSSOError}
          onMethodChosen={onMethodChosen}
          onProcessStarted={onProcessStarted}
          onProcessEnded={onProcessEnded}
          isHeb={isHeb}
          theme={theme}
        />
      )}
    </View>
  );
};

const OrDivider = ({ theme }) => {
  const { interfaceLanguage } = useContext(GlobalStateContext);
  const isHeb = interfaceLanguage === 'hebrew';

  return (
    <View style={styles.orDivider}>
      <View style={[styles.orDividerLine, theme.ssoDividerLine]} />
      <Text style={[styles.orDividerText, theme.ssoDividerText, isHeb ? styles.heInt : styles.enInt]}>{strings.or}</Text>
      <View style={[styles.orDividerLine, theme.ssoDividerLine]} />
    </View>
  );
};

// `theme` is always the caller's resolved theme object (see AuthPage, which
// pins it to the light theme regardless of the app's theme setting) rather
// than something this component resolves for itself from context.
SSOButtons.propTypes = {
  authMode: PropTypes.string.isRequired,
  onSSOSuccess: PropTypes.func.isRequired,
  onSSOError: PropTypes.func.isRequired,
  onMethodChosen: PropTypes.func.isRequired,
  onProcessStarted: PropTypes.func.isRequired,
  onProcessEnded: PropTypes.func.isRequired,
  theme: PropTypes.object.isRequired,
};

OrDivider.propTypes = {
  theme: PropTypes.object.isRequired,
};

export { SSOButtons, OrDivider, createGoogleSignInHandler, createAppleSignInHandler };
