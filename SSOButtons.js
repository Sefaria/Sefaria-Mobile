'use strict';

import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  Image,
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
        <Image
          style={styles.ssoIcon}
          source={{uri: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjIuNTYgMTIuMjVjMC0uNzgtLjA3LTEuNTMtLjItMi4yNUgxMnY0LjI2aDUuOTJjLS4yNiAxLjM3LTEuMDQgMi41My0yLjIxIDMuMzF2Mi43N2gzLjU3YzIuMDgtMS45MiAzLjI4LTQuNzQgMy4yOC04LjA5eiIgZmlsbD0iIzQyODVGNCIvPjxwYXRoIGQ9Ik0xMiAyM2MzIDAgNS41MS0uOTkgNy4zNC0yLjY4bC0zLjU3LTIuNzdjLS45OS42Ny0yLjI1IDEuMDYtMy43NyAxLjA2LTIuOTEgMC01LjM3LTEuOTYtNi4yNS00LjZIMi4xOHYyLjg0QzMuOTkgMjAuNTMgNy43IDIzIDEyIDIzeiIgZmlsbD0iIzM0QTg1MyIvPjxwYXRoIGQ9Ik01Ljc1IDE0LjAxYy0uMjMtLjY3LS4zNi0xLjM5LS4zNi0yLjEzcy4xMy0xLjQ2LjM2LTIuMTNWNi45MUgyLjE4QTEwLjk5IDEwLjk5IDAgMDAxIDExLjg4YzAgMS43OC40MyAzLjQ2IDEuMTggNC45N2wzLjU3LTIuODR6IiBmaWxsPSIjRkJCQzA1Ii8+PHBhdGggZD0iTTEyIDUuMzhjMS42MiAwIDMuMDYuNTYgNC4yMSAxLjY0bDMuMTUtMy4xNUMxNy40NSAyLjA5IDE0Ljk3IDEgMTIgMSA3LjcgMSAzLjk5IDMuNDcgMi4xOCA2LjkxbDMuNTcgMi44NGMuODgtMi42NCAzLjM0LTQuNiA2LjI1LTQuNnoiIGZpbGw9IiNFQTQzMzUiLz48L3N2Zz4="}}
        />
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
        <Image
          style={styles.ssoIcon}
          source={{uri: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTcuMDUgMjAuMjhjLS45OC44OS0yLjA1Ljg0LTMuMTguNDItMS4xMy0uNDMtMS45Mi0uNDUtMy4xOCAwLTEuMzEuNDctMi4xNS40Ny0zLjE4LS40Mi0xLjA3LS45MS0xLjktMi4wMi0yLjkzLTMuMzYtMS4yMS0xLjU0LTIuMTktMy40NC0yLjE5LTUuNTcgMC0zLjIgMi4xMS01LjM4IDQuNjktNS4zOCAxLjI0IDAgMi4yOC41NCAzLjEuNTQuOCAwIDIuMy0uNjMgMy4zNS0uNTQuMzguMDEgMi43Ni4xNSA0LjA3IDEuMTEtLjEuMDctMi40MyAxLjQyLTIuNCA0LjI0LjAzIDMuMzcgMi45NiA0LjQ5IDMgNC41MS0uMDIuMDctLjQ3IDEuNi0xLjU1IDMuMTd6TTEyLjAyIDQuMDFjLjEzLTEuNTguNzktMi44OCAxLjc4LTMuOTdDMTQuOC4wMyAxNS44OS0uMSAxNi44OC4wNGMuMTQgMS43My0uNDQgMy4wMS0xLjQgNC4xLS45NiAxLjA4LTIuMTIgMS45MS0zLjQ2IDEuODd6IiBmaWxsPSIjMDAwMDAwIi8+PC9zdmc+"}}
        />
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
