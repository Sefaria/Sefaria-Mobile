'use strict';

import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import strings from './LocalizedStrings';
import styles from './Styles';
import { GlobalStateContext } from './StateManager';

const GoogleSignInButton = ({ isLoading, loadingProvider, setIsLoading, setLoadingProvider, onSSOSuccess, onSSOError }) => {
  const handleGoogleSignIn = async () => {
    try {
      setLoadingProvider('google');
      setIsLoading(true);
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
    <TouchableOpacity style={[styles.ssoButton]} onPress={handleGoogleSignIn} disabled={isLoading}>
      {isLoading && loadingProvider === 'google' ? (
        <ActivityIndicator />
      ) : (
        <View style={{width: 24, height: 24, alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{fontSize: 18, fontWeight: 'bold', color: '#4285F4'}}>G</Text>
        </View>
      )}
      <Text style={styles.ssoButtonText}>{strings.continueWithGoogle}</Text>
    </TouchableOpacity>
  );
};

const AppleSignInButton = ({ isLoading, loadingProvider, setIsLoading, setLoadingProvider, onSSOSuccess, onSSOError }) => {
  const handleAppleSignIn = async () => {
    if (Platform.OS === 'ios') {
      const appleAuth = require('@invertase/react-native-apple-authentication').default;
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
      // Android: web redirect — will be implemented with WebView
      onSSOError(new Error('Apple Sign-In on Android requires web redirect (not yet implemented)'));
    }
  };

  return (
    <TouchableOpacity style={[styles.ssoButton]} onPress={handleAppleSignIn} disabled={isLoading}>
      {isLoading && loadingProvider === 'apple' ? (
        <ActivityIndicator />
      ) : (
        <View style={{width: 24, height: 24, alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{fontSize: 20, color: '#000000', lineHeight: 24}}>{Platform.OS === 'ios' ? '' : '\u{F8FF}'}</Text>
        </View>
      )}
      <Text style={styles.ssoButtonText}>{strings.continueWithApple}</Text>
    </TouchableOpacity>
  );
};

const SSOButtons = ({ authMode, onSSOSuccess, onSSOError }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState(null); // 'google' | 'apple' | null
  const { themeStr, interfaceLanguage } = useContext(GlobalStateContext);
  const showApple = Platform.OS === 'ios' || authMode === 'login';

  React.useEffect(() => {
    GoogleSignin.configure({
      webClientId: '', // TODO: Add Google OAuth web client ID
      offlineAccess: true,
    });
  }, []);

  return (
    <View style={styles.ssoSection}>
      <GoogleSignInButton
        isLoading={isLoading}
        loadingProvider={loadingProvider}
        setIsLoading={setIsLoading}
        setLoadingProvider={setLoadingProvider}
        onSSOSuccess={onSSOSuccess}
        onSSOError={onSSOError}
      />
      {showApple ? (
        <AppleSignInButton
          isLoading={isLoading}
          loadingProvider={loadingProvider}
          setIsLoading={setIsLoading}
          setLoadingProvider={setLoadingProvider}
          onSSOSuccess={onSSOSuccess}
          onSSOError={onSSOError}
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
