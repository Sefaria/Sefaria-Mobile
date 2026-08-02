'use strict';

import React, { useState, useContext } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import remoteConfig from '@react-native-firebase/remote-config';

import {
  RainbowBar,
  CircleCloseButton,
  SystemButton,
} from './Misc';
import { GlobalStateContext, DispatchContext, STATE_ACTIONS, getTheme } from './StateManager';
import Sefaria from './sefaria';
import strings from './LocalizedStrings';
import styles from './Styles';
import { trackEvent } from './analytics/events';
import { SSOButtons, OrDivider } from './SSOButtons';
import SSOErrorBanner from './SSOErrorBanner';

// Maps a backend SSO error code/string to a localized, user-facing message.
// NOTE: the backend does not currently emit a distinct machine-readable code
// for "this email already exists via a different provider" -- these branches
// are wired up so they activate automatically once the backend adds such a
// code, but today they are unreachable dead code. Every code we actually see
// today ('Invalid token', 'Authentication failed', 'Invalid JSON',
// 'id_token required', 'auth.generic_error', 'network_error', undefined)
// falls through to the generic message.
const ssoErrorMessage = (code) => {
  const normalized = (code || '').toString().toLowerCase();
  const mentionsExistingEmail = normalized.includes('email') && normalized.includes('exist');
  if (mentionsExistingEmail && normalized.includes('google')) {
    return strings.ssoEmailExistsGoogle;
  }
  if (mentionsExistingEmail && normalized.includes('apple')) {
    return strings.ssoEmailExistsApple;
  }
  if (mentionsExistingEmail) {
    return strings.ssoEmailExistsGeneric;
  }
  return strings.ssoErrorGeneric;
};

const onSubmit = async (formState, authMode, setErrors, onLoginSuccess, setIsLoading) => {
  setIsLoading(true);
  const mobileAppKey = await getMobileAppKey();
  formState.mobile_app_key = mobileAppKey;
  let errors = await Sefaria.api.authenticate(formState, authMode);
  if (!errors) { errors = {}; }
  setErrors(errors);
  setIsLoading(false);
  if (Object.keys(errors).length === 0 && Sefaria._auth.uid) {
    // Set the user email in state - pass dispatch function to onLoginSuccess
    onLoginSuccess(formState.email);
  }
};

const getMobileAppKey = async () => {
  remoteConfig().setDefaults({ mobile_app_key: '' });
  await remoteConfig().fetch(0);
  const activated = await remoteConfig().activate();
  //if (!activated) { console.log('Fetch data not activated'); return ''; }  I may have misunderstood what activated meant. but we shouldn't return '' if it's false
  const snapshot = await remoteConfig().getValue('mobile_app_key');
  return snapshot.asString();
};

const useAuthForm = (authMode, onLoginSuccess) => {
  const [first_name, setFirstName] = useState(null);
  const [last_name, setLastName] = useState(null);
  const [email, setEmail] = useState(null);
  const [password, setPassword] = useState(null);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const formState = {
    first_name,
    last_name,
    email,
    password,
  };
  return {
    errors,
    setFirstName,
    setLastName,
    setEmail,
    setPassword,
    isLoading,
    onSubmit: () => { onSubmit(formState, authMode, setErrors, onLoginSuccess, setIsLoading) },
  }
}

const AuthPage = ({ authMode, close, showToast, openLogin, openRegister, openUri, syncProfile }) => {
  const dispatch = useContext(DispatchContext);
  const { themeStr, interfaceLanguage } = useContext(GlobalStateContext);
  const {
    errors,
    setFirstName,
    setLastName,
    setEmail,
    setPassword,
    isLoading,
    onSubmit,
  } = useAuthForm(authMode, async (email) => {
    dispatch({
      type: STATE_ACTIONS.setIsLoggedIn,
      value: true,
    });
    // Set user email in state
    dispatch({
      type: STATE_ACTIONS.setUserEmail,
      value: email,
    });
    trackEvent("LoginSuccessful", {authMode});
    // try to sync immediately after login
    syncProfile();
    close(authMode);
    showToast(strings.loginSuccessful);
  });
  const theme = getTheme(themeStr);
  const isLogin = authMode === 'login';
  const placeholderTextColor = themeStr == "black" ? "#BBB" : "#777";
  const isHeb = interfaceLanguage === 'hebrew';

  const [ssoError, setSsoError] = useState(null);

  const handleSSOSuccess = async (provider, idToken, userData) => {
    const result = await Sefaria.api.socialLogin(provider, idToken, userData);
    if (result.success) {
      dispatch({
        type: STATE_ACTIONS.setIsLoggedIn,
        value: true,
      });
      dispatch({
        type: STATE_ACTIONS.setUserEmail,
        // result.email comes from the signed ID token (verified server-side) and
        // wins over userData?.email, which is only populated by Apple on the
        // user's first authorization and is null on every subsequent sign-in.
        value: result.email || userData?.email,
      });
      trackEvent("LoginSuccessful", { authMode, provider });
      syncProfile();
      close(authMode);
      showToast(strings.loginSuccessful);
    } else {
      if (__DEV__) {
        setSsoError(`SSO backend error [${result.code}]: ${JSON.stringify(result.error).slice(0, 200)}`);
      } else {
        setSsoError(ssoErrorMessage(result.code));
      }
    }
  };

  const handleSSOError = (error) => {
    console.log('SSO Error:', error);
    if (__DEV__) {
      setSsoError(`SSO [${error?.code}] ${error?.message}`);
    } else {
      setSsoError(ssoErrorMessage(error?.code));
    }
  };

  const mainContent = (
    <ScrollView style={{flex:1, alignSelf: "stretch"}} contentContainerStyle={{alignItems: "center", paddingBottom: 50}} keyboardShouldPersistTaps='handled'>
      <RainbowBar />
      <View style={{ flex: 1, alignSelf: "stretch", alignItems: "flex-end", marginHorizontal: 10}}>
        <CircleCloseButton onPress={close} />
      </View>
      <Text style={[styles.pageTitle, theme.text]}>{isLogin ? strings.login : strings.signup}</Text>
      <View style={{flex: 1, alignSelf: "stretch",  marginHorizontal: 37}}>
        <SSOButtons
          authMode={authMode}
          onSSOSuccess={handleSSOSuccess}
          onSSOError={handleSSOError}
        />
        <OrDivider />
        <SSOErrorBanner error={ssoError ? { message: ssoError } : null} />
        { isLogin ? null :
          <AuthTextInput
            placeholder={strings.first_name}
            placeholderTextColor={placeholderTextColor}
            error={errors.first_name}
            errorText={errors.first_name}
            onChangeText={setFirstName}
          />
        }
        { isLogin ? null :
          <AuthTextInput
            placeholder={strings.last_name}
            placeholderTextColor={placeholderTextColor}
            error={errors.last_name}
            errorText={errors.last_name}
            onChangeText={setLastName}
          />
        }
        <AuthTextInput
          placeholder={strings.email}
          autoCapitalize={'none'}
          placeholderTextColor={placeholderTextColor}
          error={errors.username || errors.email}
          errorText={errors.username || errors.email}
          onChangeText={setEmail}
        />
        <AuthTextInput
          placeholder={strings.password}
          placeholderTextColor={placeholderTextColor}
          isPW={true}
          error={errors.password || errors.password1}
          errorText={errors.password || errors.password1}
          onChangeText={setPassword}
        />
        <ErrorText error={errors.non_field_errors} errorText={errors.non_field_errors} />
        <SystemButton
          isLoading={isLoading}
          onPress={onSubmit}
          text={isLogin ? strings.login : strings.signup}
          isHeb={isHeb}
          isBlue
        />
        {
          isLogin ?
            <View style={{ alignItems: 'center', marginTop: 15 }}>
              <View style={{flexDirection: isHeb ? 'row-reverse' : 'row', alignItems: 'center'}}>
                <Text style={[theme.secondaryText, isHeb ? styles.heInt : styles.enInt]}>{strings.dontHaveAnAccount}</Text>
                <TouchableOpacity onPress={openRegister}>
                  <Text style={[theme.text, isHeb ? styles.heInt : styles.enInt]}>{` ${strings.createAnAccount}`}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={() => { openUri('https://www.sefaria.org/password/reset')}}>
                <Text style={[theme.text, isHeb ? styles.heInt : styles.enInt]}>{strings.forgotPassword}</Text>
              </TouchableOpacity>
            </View>
          :
            <View style={{alignItems: 'center', marginTop: 15}}>
              <View style={{flexDirection: isHeb ? 'row-reverse' : 'row', alignItems: 'center'}}>
                <Text style={[theme.secondaryText, isHeb ? styles.heInt : styles.enInt]}>{strings.alreadyHaveAnAccount}</Text>
                <TouchableOpacity onPress={openLogin}>
                  <Text style={[theme.text, isHeb ? styles.heInt : styles.enInt]}>{` ${strings.login}.`}</Text>
                </TouchableOpacity>
              </View>

              <View style={{alignItems: 'center'}}>
                <Text style={[theme.secondaryText, isHeb ? styles.heInt : styles.enInt]}>{strings.byClickingSignUp}</Text>
                <TouchableOpacity onPress={() => { openUri('https://www.sefaria.org/terms')}}>
                  <Text style={[theme.text, isHeb ? styles.heInt : styles.enInt]}>{` ${strings.termsOfUseAndPrivacyPolicy}.`}</Text>
                </TouchableOpacity>
              </View>
            </View>
        }
      </View>
    </ScrollView>

  )


  return(
    Platform.OS == "ios" ?
    <KeyboardAvoidingView style={{flex:1, alignSelf: "stretch"}} contentContainerStyle={{alignItems: "center", paddingBottom: 50}} behavior="padding">
      {mainContent}
    </KeyboardAvoidingView>
    :
    <View style={{flex:1, alignSelf: "stretch"}} contentContainerStyle={{alignItems: "center", paddingBottom: 50}}>
      {mainContent}
    </View>
  )
}
AuthPage.propTypes = {
  authMode: PropTypes.string.isRequired,
  close:    PropTypes.func.isRequired,
  showToast:PropTypes.func.isRequired,
  openLogin: PropTypes.func.isRequired,
  openRegister: PropTypes.func.isRequired,
  openUri: PropTypes.func.isRequired,
};

const ErrorText = ({ error, errorText }) => (
  error ?
    (
      <Text>
        { errorText }
      </Text>
    ) : null
);

const AuthTextInput = ({
  isPW,
  placeholder,
  placeholderTextColor,
  autoCapitalize,
  error,
  errorText,
  onChangeText,
}) => (
  <GlobalStateContext.Consumer>
    {
      ({ themeStr, interfaceLanguage }) => (
        <View>
          <TextInput
            style={[
              styles.textInput,
              styles.systemButton,
              styles.boxShadow,
              styles.authTextInput,
              interfaceLanguage === 'hebrew' ? styles.heInt : styles.enInt,
              getTheme(themeStr).text,
              getTheme(themeStr).mainTextPanel
            ]}
            placeholder={placeholder}
            placeholderTextColor={placeholderTextColor}
            secureTextEntry={isPW}
            autoCapitalize={autoCapitalize}
            onChangeText={onChangeText}
          />
          <ErrorText error={error} errorText={errorText} />
        </View>
      )
    }
  </GlobalStateContext.Consumer>
);

export {
  AuthPage,
  AuthTextInput,
};
