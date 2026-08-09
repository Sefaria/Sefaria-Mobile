'use strict';

import React, { useState, useContext } from 'react';
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
import { GlobalStateContext, getTheme } from './StateManager';
import Sefaria from './sefaria';
import { SSO_PROVIDER, AUTH_MODE, ANALYTICS_STATUS, ANALYTICS_REASON } from './AuthConstants';

// Apple has no native Android SDK; per the Figma spec Android falls back to a
// mobile-web redirect. This reads the same host api.js uses (Sefaria.api._baseHost)
// so the two can never diverge.
// NOTE: completing the round-trip back into the app requires the backend to
// deep-link back (see DeepLinkRouter.js) — otherwise the user can get stuck in
// the browser (a known limitation called out in the Figma spec).
const appleAndroidRedirectUrl = () => `${Sefaria.api._baseHost}accounts/apple/login/`;

const GoogleSignInButton = ({ authMode, isLoading, loadingProvider, setIsLoading, setLoadingProvider, onSSOSuccess, onSSOError, onMethodChosen, onProcessStarted, onProcessEnded, isHeb, theme }) => {
  const handleGoogleSignIn = async () => {
    // Fired at the very top of the handler, before any async work, so it
    // captures the tap itself rather than however long setup/network takes.
    onMethodChosen(SSO_PROVIDER.GOOGLE);
    let GoogleSignin, statusCodes;
    try {
      ({ GoogleSignin, statusCodes } = require('@react-native-google-signin/google-signin'));
    } catch (e) {
      onProcessEnded({ status: ANALYTICS_STATUS.FAILURE, reason: ANALYTICS_REASON.MODULE_UNAVAILABLE });
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
      if (authMode === AUTH_MODE.REGISTER) {
        // The native SDK remembers the last authorized account and would sign
        // the user straight back in with it. On sign-up that's wrong: someone
        // creating an account needs to choose which Google account it belongs
        // to, not silently inherit whoever signed in last on this device.
        // Best-effort — nothing to clear on a first run.
        try {
          await GoogleSignin.signOut();
        } catch (e) {}
      }
      const response = await GoogleSignin.signIn();
      // Since v13 a cancellation RESOLVES as { type: 'cancelled', data: null }
      // rather than rejecting with SIGN_IN_CANCELLED, so it never reaches the
      // catch below. It has to be recognised here or `data?.idToken` is
      // undefined and a dismissed picker -- the normal outcome on a device with
      // no Google account, e.g. every BrowserStack device -- reaches the user as
      // a provider error and lands in the funnel as one.
      if (response?.type === 'cancelled') {
        onProcessEnded({ status: ANALYTICS_STATUS.FAILURE, reason: ANALYTICS_REASON.CANCELLED });
        return;
      }
      const idToken = response.data?.idToken;
      if (idToken) {
        await onSSOSuccess(SSO_PROVIDER.GOOGLE, idToken, {
          email: response.data?.user?.email,
          firstName: response.data?.user?.givenName,
          lastName: response.data?.user?.familyName,
        });
      } else {
        // Reached when the SDK signs in but returns no token, which on Android
        // means webClientId was empty at configure() time: Utils.java only calls
        // requestIdToken(webClientId) when it is non-empty, so the flow succeeds
        // and getIdToken() is null. Surface it instead of failing silently.
        onProcessEnded({ status: ANALYTICS_STATUS.FAILURE, reason: ANALYTICS_REASON.PROVIDER_ERROR, error: 'No identity token returned' });
        onSSOError(new Error('Google sign-in did not return an identity token.'));
      }
    } catch (error) {
      if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
        onProcessEnded({ status: ANALYTICS_STATUS.FAILURE, reason: ANALYTICS_REASON.PROVIDER_ERROR, error: error?.code || error?.message });
        onSSOError(error);
      } else {
        // Cancel is intentionally swallowed from the user-facing error banner
        // (unchanged behavior) but still needs to be tracked as a failure.
        onProcessEnded({ status: ANALYTICS_STATUS.FAILURE, reason: ANALYTICS_REASON.CANCELLED });
      }
    } finally {
      setIsLoading(false);
      setLoadingProvider(null);
    }
  };

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

const AppleSignInButton = ({ isLoading, loadingProvider, setIsLoading, setLoadingProvider, onSSOSuccess, onSSOError, onMethodChosen, onProcessStarted, onProcessEnded, isHeb, theme }) => {
  const handleAppleSignIn = async () => {
    // Fired at the very top of the handler, before any async work or the
    // iOS/Android branch, so it captures the tap itself.
    onMethodChosen(SSO_PROVIDER.APPLE);
    if (Platform.OS === 'ios') {
      let appleAuth;
      try {
        appleAuth = require('@invertase/react-native-apple-authentication').default;
      } catch (e) {
        onProcessEnded({ status: ANALYTICS_STATUS.FAILURE, reason: ANALYTICS_REASON.MODULE_UNAVAILABLE });
        onSSOError(new Error('Apple Sign-In native module not available. Rebuild the app with: npx react-native run-ios'));
        return;
      }
      if (!appleAuth.isSupported) {
        onProcessEnded({ status: ANALYTICS_STATUS.FAILURE, reason: ANALYTICS_REASON.UNSUPPORTED_DEVICE });
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
          await onSSOSuccess(SSO_PROVIDER.APPLE, identityToken, {
            email,
            firstName: fullName?.givenName,
            lastName: fullName?.familyName,
          });
        } else {
          onProcessEnded({ status: ANALYTICS_STATUS.FAILURE, reason: ANALYTICS_REASON.PROVIDER_ERROR, error: 'No identity token returned' });
        }
      } catch (error) {
        if (error.code !== appleAuth.Error.CANCELED) {
          onProcessEnded({ status: ANALYTICS_STATUS.FAILURE, reason: ANALYTICS_REASON.PROVIDER_ERROR, error: error?.code || error?.message });
          onSSOError(error);
        } else {
          // Cancel path: see the same comment on the Google button above.
          onProcessEnded({ status: ANALYTICS_STATUS.FAILURE, reason: ANALYTICS_REASON.CANCELLED });
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
        onSSOError(new Error('Could not open Apple sign-in. Please try again.'));
      }
    }
  };

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

const SSOButtons = ({ authMode, onSSOSuccess, onSSOError, onMethodChosen, onProcessStarted, onProcessEnded }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState(null);
  const { interfaceLanguage, themeStr } = useContext(GlobalStateContext);
  const isHeb = interfaceLanguage === 'hebrew';
  const theme = getTheme(themeStr);
  const showApple = Platform.OS === 'ios' || authMode === AUTH_MODE.LOGIN;

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
      {showApple ? (
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
      ) : null}
    </View>
  );
};

const OrDivider = () => {
  const { interfaceLanguage, themeStr } = useContext(GlobalStateContext);
  const isHeb = interfaceLanguage === 'hebrew';
  const theme = getTheme(themeStr);

  return (
    <View style={styles.orDivider}>
      <View style={[styles.orDividerLine, theme.ssoDividerLine]} />
      <Text style={[styles.orDividerText, theme.ssoDividerText, isHeb ? styles.heInt : styles.enInt]}>{strings.or}</Text>
      <View style={[styles.orDividerLine, theme.ssoDividerLine]} />
    </View>
  );
};

export { SSOButtons, OrDivider };
