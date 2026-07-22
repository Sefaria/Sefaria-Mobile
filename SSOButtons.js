'use strict';

import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Config from 'react-native-config';
import strings from './LocalizedStrings';
import styles from './Styles';
import { GlobalStateContext } from './StateManager';

// Apple has no native Android SDK; per the Figma spec Android falls back to a
// mobile-web redirect. This opens allauth's Apple login entry on the SSO
// backend. NOTE: completing the round-trip back into the app requires the
// backend to deep-link back (see DeepLinkRouter.js) — otherwise the user can
// get stuck in the browser (a known limitation called out in the Figma spec).
const APPLE_ANDROID_REDIRECT_URL = 'https://www.sefaria.org/accounts/apple/login/';

const GoogleSignInButton = ({ isLoading, loadingProvider, setIsLoading, setLoadingProvider, onSSOSuccess, onSSOError, isHeb }) => {
  const handleGoogleSignIn = async () => {
    let GoogleSignin, statusCodes;
    try {
      ({ GoogleSignin, statusCodes } = require('@react-native-google-signin/google-signin'));
    } catch (e) {
      onSSOError(new Error('Google Sign-In native module not available. Rebuild the app with: npx react-native run-ios'));
      return;
    }
    try {
      setLoadingProvider('google');
      setIsLoading(true);
      GoogleSignin.configure({
        iosClientId: Config.GOOGLE_SSO_IOS_CLIENT_ID,
        webClientId: Config.GOOGLE_SSO_CLIENT_ID,
      });
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (idToken) {
        await onSSOSuccess('google', idToken, {
          email: response.data?.user?.email,
          firstName: response.data?.user?.givenName,
          lastName: response.data?.user?.familyName,
        });
      }
    } catch (error) {
      if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
        onSSOError(error);
      }
    } finally {
      setIsLoading(false);
      setLoadingProvider(null);
    }
  };

  return (
    <TouchableOpacity style={[styles.ssoButton, isHeb && { flexDirection: 'row-reverse' }]} onPress={handleGoogleSignIn} disabled={isLoading}>
      {isLoading && loadingProvider === 'google' ? (
        <ActivityIndicator />
      ) : (
        <Image source={require('./img/sso-google.png')} style={styles.ssoIcon} resizeMode="contain" />
      )}
      <Text style={[styles.ssoButtonText, isHeb ? styles.heInt : styles.enInt]}>{strings.continueWithGoogle}</Text>
    </TouchableOpacity>
  );
};

const AppleSignInButton = ({ isLoading, loadingProvider, setIsLoading, setLoadingProvider, onSSOSuccess, onSSOError, isHeb }) => {
  const handleAppleSignIn = async () => {
    if (Platform.OS === 'ios') {
      let appleAuth;
      try {
        appleAuth = require('@invertase/react-native-apple-authentication').default;
      } catch (e) {
        onSSOError(new Error('Apple Sign-In native module not available. Rebuild the app with: npx react-native run-ios'));
        return;
      }
      if (!appleAuth.isSupported) {
        onSSOError(new Error('Apple Sign-In is not supported on this device (requires a real iOS device, not a simulator)'));
        return;
      }
      try {
        setLoadingProvider('apple');
        setIsLoading(true);
        const appleAuthRequestResponse = await appleAuth.performRequest({
          requestedOperation: appleAuth.Operation.LOGIN,
          requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
        });
        const { identityToken, fullName, email } = appleAuthRequestResponse;
        if (identityToken) {
          await onSSOSuccess('apple', identityToken, {
            email,
            firstName: fullName?.givenName,
            lastName: fullName?.familyName,
          });
        }
      } catch (error) {
        if (error.code !== appleAuth.Error.CANCELED) {
          onSSOError(error);
        }
      } finally {
        setIsLoading(false);
        setLoadingProvider(null);
      }
    } else {
      try {
        await Linking.openURL(APPLE_ANDROID_REDIRECT_URL);
      } catch (error) {
        onSSOError(new Error('Could not open Apple sign-in. Please try again.'));
      }
    }
  };

  return (
    <TouchableOpacity style={[styles.ssoButton, isHeb && { flexDirection: 'row-reverse' }]} onPress={handleAppleSignIn} disabled={isLoading}>
      {isLoading && loadingProvider === 'apple' ? (
        <ActivityIndicator />
      ) : (
        <Image source={require('./img/sso-apple.png')} style={styles.ssoIcon} resizeMode="contain" />
      )}
      <Text style={[styles.ssoButtonText, isHeb ? styles.heInt : styles.enInt]}>{strings.continueWithApple}</Text>
    </TouchableOpacity>
  );
};

const SSOButtons = ({ authMode, onSSOSuccess, onSSOError }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState(null);
  const { interfaceLanguage } = useContext(GlobalStateContext);
  const isHeb = interfaceLanguage === 'hebrew';
  const showApple = Platform.OS === 'ios' || authMode === 'login';

  return (
    <View style={styles.ssoSection}>
      <GoogleSignInButton
        isLoading={isLoading}
        loadingProvider={loadingProvider}
        setIsLoading={setIsLoading}
        setLoadingProvider={setLoadingProvider}
        onSSOSuccess={onSSOSuccess}
        onSSOError={onSSOError}
        isHeb={isHeb}
      />
      {showApple ? (
        <AppleSignInButton
          isLoading={isLoading}
          loadingProvider={loadingProvider}
          setIsLoading={setIsLoading}
          setLoadingProvider={setLoadingProvider}
          onSSOSuccess={onSSOSuccess}
          onSSOError={onSSOError}
          isHeb={isHeb}
        />
      ) : null}
    </View>
  );
};

const OrDivider = () => {
  const { interfaceLanguage } = useContext(GlobalStateContext);
  const isHeb = interfaceLanguage === 'hebrew';

  return (
    <View style={styles.orDivider}>
      <View style={styles.orDividerLine} />
      <Text style={[styles.orDividerText, isHeb ? styles.heInt : styles.enInt]}>{strings.or}</Text>
      <View style={styles.orDividerLine} />
    </View>
  );
};

export { SSOButtons, OrDivider };
