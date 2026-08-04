'use strict';

import React, { useState, useContext, useRef, useEffect } from 'react';
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
import { AUTH_EVENT_FAMILY, truncateForAnalytics, generateUUID } from './analytics/authEventFamilies';
import { SSOButtons, OrDivider } from './SSOButtons';
import SSOErrorBanner from './SSOErrorBanner';

// Exact-match map from the backend's English collision sentences (raised by
// SefariaNewUserForm.clean_email on the register path) to the localized string
// *key* that should be shown for each. Values are key names rather than
// `strings.x` snapshots because `strings` is re-localized at runtime when the
// interface language changes -- capturing `strings.x` here at module load
// would freeze these messages in whatever language was active on first import.
// Same three sentences web's RegisterView.jsx maps.
const SSO_COLLISION_MESSAGE_KEYS = {
  "This email address is already registered via Google Sign-In.": 'ssoEmailExistsGoogle',
  "This email address is already registered via Apple Sign-In.": 'ssoEmailExistsApple',
  "An account with this email address already exists.": 'ssoEmailExistsGeneric',
};

// Returns the localized collision message for an exact backend match, or null.
// Django form errors may arrive as a bare string or an array of strings.
const ssoCollisionMessage = (backendMessage) => {
  const messages = Array.isArray(backendMessage) ? backendMessage : [backendMessage];
  for (const message of messages) {
    const key = SSO_COLLISION_MESSAGE_KEYS[(message || '').toString().trim()];
    if (key) { return strings[key]; }
  }
  return null;
};

const onSubmit = async (formState, authMode, setErrors, onLoginSuccess, setIsLoading, onEmailSubmitResult) => {
  setIsLoading(true);
  const mobileAppKey = await getMobileAppKey();
  formState.mobile_app_key = mobileAppKey;
  let errors = await Sefaria.api.authenticate(formState, authMode);
  if (!errors) { errors = {}; }
  setErrors(errors);
  setIsLoading(false);
  const success = Object.keys(errors).length === 0 && !!Sefaria._auth.uid;
  onEmailSubmitResult?.(success);
  if (success) {
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

const useAuthForm = (authMode, onLoginSuccess, onEmailSubmitResult) => {
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
    onSubmit: () => { onSubmit(formState, authMode, setErrors, onLoginSuccess, setIsLoading, onEmailSubmitResult) },
  }
}

const AuthPage = ({ authMode, close, showToast, openLogin, openRegister, openUri, syncProfile, source }) => {
  const dispatch = useContext(DispatchContext);
  const { themeStr, interfaceLanguage } = useContext(GlobalStateContext);

  // Analytics flow/attempt bookkeeping. AuthPage remounts (via the `key` on it
  // in ReaderApp.js) on every login <-> register switch, so refs created here
  // correctly start a fresh flow each time -- no manual reset needed.
  const family = AUTH_EVENT_FAMILY[authMode];
  const flowIdRef = useRef(generateUUID());
  const attemptIdRef = useRef(null);
  const emailAttemptActiveRef = useRef(false);
  const flowOutcomeRef = useRef({ succeeded: false, isNewAccount: undefined });

  useEffect(() => {
    trackEvent(`${family}_flow_started`, source ? { flow_id: flowIdRef.current, source } : { flow_id: flowIdRef.current });
    return () => {
      const outcome = flowOutcomeRef.current;
      const params = { flow_id: flowIdRef.current };
      if (outcome.succeeded) {
        params.status = 'success';
        if (outcome.isNewAccount !== undefined) { params.is_new_account = outcome.isNewAccount; }
      } else {
        params.status = 'failure';
        params.reason = 'abandoned';
      }
      trackEvent(`${family}_flow_ended`, params);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mints a fresh attempt_id and fires <fam>_method_chosen. Called for every
  // new provider tap or new email attempt -- never gated behind a "sent once"
  // flag, so retries correctly re-fire.
  const fireMethodChosen = (method) => {
    const attemptId = generateUUID();
    attemptIdRef.current = attemptId;
    trackEvent(`${family}_method_chosen`, { flow_id: flowIdRef.current, attempt_id: attemptId, method });
  };

  const fireProcessStarted = () => {
    trackEvent(`${family}_process_started`, { flow_id: flowIdRef.current, attempt_id: attemptIdRef.current });
  };

  const fireProcessEnded = ({ status, error, reason }) => {
    if (!attemptIdRef.current) { return; }
    const params = { flow_id: flowIdRef.current, attempt_id: attemptIdRef.current, status };
    const truncatedError = truncateForAnalytics(error);
    if (truncatedError !== undefined) { params.error = truncatedError; }
    if (reason) { params.reason = reason; }
    trackEvent(`${family}_process_ended`, params);
    // Allow a subsequent email attempt (new focus after this one ends) to mint
    // a fresh attempt_id. No-op for SSO attempts, which don't use this ref.
    emailAttemptActiveRef.current = false;
  };

  // Opens an email attempt if one isn't already open. Bookends the email
  // sub-flow the same way a Google/Apple tap does, but fires process_started
  // immediately since email has no provider pre-flight step to measure.
  //
  // Called from two places, and it needs both. Field focus is the trigger the
  // spec asks for, but focus alone is not sufficient: after a failed submit,
  // fireProcessEnded clears the active flag, and a user who corrects nothing
  // and simply taps the button again would produce a process_ended with a
  // stale attempt_id and no matching method_chosen/process_started. Calling it
  // from submit as well guarantees every attempt is properly bracketed, which
  // is the whole point of tracking retries separately.
  const beginEmailAttempt = () => {
    if (emailAttemptActiveRef.current) { return; }
    emailAttemptActiveRef.current = true;
    fireMethodChosen('email');
    fireProcessStarted();
  };

  const handleEmailSubmitResult = (success) => {
    fireProcessEnded(success ? { status: 'success' } : { status: 'failure', reason: 'validation_failed' });
    if (success) { flowOutcomeRef.current.succeeded = true; }
  };

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
  }, handleEmailSubmitResult);
  const theme = getTheme(themeStr);
  const isLogin = authMode === 'login';
  const placeholderTextColor = themeStr == "black" ? "#BBB" : "#777";
  const isHeb = interfaceLanguage === 'hebrew';

  const [ssoError, setSsoError] = useState(null);
  const emailCollisionMessage = ssoCollisionMessage(errors.email);

  const handleSSOSuccess = async (provider, idToken, userData) => {
    const result = await Sefaria.api.socialLogin(provider, idToken, userData);
    if (result.success) {
      fireProcessEnded({ status: 'success' });
      flowOutcomeRef.current.succeeded = true;
      if (result.is_new_account !== undefined) { flowOutcomeRef.current.isNewAccount = result.is_new_account; }
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
      // `error` here is the SDK/server error code -- never the closed `reason`
      // enum -- per the analytics field contract.
      fireProcessEnded({ status: 'failure', reason: 'server_rejected', error: result.code });
      if (__DEV__) {
        setSsoError(`SSO backend error [${result.code}]: ${JSON.stringify(result.error).slice(0, 200)}`);
      } else {
        setSsoError(strings.ssoErrorGeneric);
      }
    }
  };

  const handleSSOError = (error) => {
    console.log('SSO Error:', error);
    if (__DEV__) {
      setSsoError(`SSO [${error?.code}] ${error?.message}`);
    } else {
      setSsoError(strings.ssoErrorGeneric);
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
          onMethodChosen={fireMethodChosen}
          onProcessStarted={fireProcessStarted}
          onProcessEnded={fireProcessEnded}
        />
        <OrDivider />
        <SSOErrorBanner error={(ssoError || emailCollisionMessage) ? { message: ssoError || emailCollisionMessage } : null} />
        { isLogin ? null :
          <AuthTextInput
            placeholder={strings.first_name}
            placeholderTextColor={placeholderTextColor}
            error={errors.first_name}
            errorText={errors.first_name}
            onChangeText={setFirstName}
            onFocus={beginEmailAttempt}
          />
        }
        { isLogin ? null :
          <AuthTextInput
            placeholder={strings.last_name}
            placeholderTextColor={placeholderTextColor}
            error={errors.last_name}
            errorText={errors.last_name}
            onChangeText={setLastName}
            onFocus={beginEmailAttempt}
          />
        }
        <AuthTextInput
          placeholder={strings.email}
          autoCapitalize={'none'}
          placeholderTextColor={placeholderTextColor}
          error={!emailCollisionMessage && (errors.username || errors.email)}
          errorText={!emailCollisionMessage && (errors.username || errors.email)}
          onChangeText={setEmail}
          onFocus={beginEmailAttempt}
        />
        <AuthTextInput
          placeholder={strings.password}
          placeholderTextColor={placeholderTextColor}
          isPW={true}
          error={errors.password || errors.password1}
          errorText={errors.password || errors.password1}
          onChangeText={setPassword}
          onFocus={beginEmailAttempt}
        />
        <ErrorText error={errors.non_field_errors} errorText={errors.non_field_errors} />
        <SystemButton
          isLoading={isLoading}
          onPress={() => { setSsoError(null); beginEmailAttempt(); onSubmit(); }}
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
  // How the user reached this page (nav_bar, la_banner, etc.), passed down
  // from ReaderApp's openMenu(menu, via). Omitted (null) when AuthPage was
  // reached without a `via`, e.g. switching between login <-> register.
  source: PropTypes.string,
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
  onFocus,
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
            onFocus={onFocus}
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
  ssoCollisionMessage,
};
