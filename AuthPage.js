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
import { AUTH_MODE, ANALYTICS_STATUS, ANALYTICS_REASON } from './AuthConstants';

// Exact-match map from the backend's English collision sentences (raised by
// SefariaNewUserForm.clean_email on the register path) to the localized string
// *key* that should be shown for each. Values are key names rather than
// `strings.x` snapshots because `strings` is re-localized at runtime when the
// interface language changes -- capturing `strings.x` here at module load
// would freeze these messages in whatever language was active on first import.
// Same three sentences web's RegisterView.jsx maps.
// TEMPORARY: the auth screen opts out of the app's dark theme and always
// renders light, because the Figma design defines only a light treatment and
// the SSO provider marks (Google's full-color G, Apple's black logo) need a
// light surface. This is a stopgap, not the intended end state -- the real fix
// is a dark variant from design, at which point this constant goes away and the
// page reads themeStr like every other screen.
//
// Scope is deliberately limited to this page: the forced theme is resolved here
// once and passed DOWN as a prop to every child. Shared components (Misc.js's
// SystemButton / CircleCloseButton) take it as an OPTIONAL override that falls
// back to global state, so no other screen's dark mode is affected. If you add
// a child here, pass it `theme` rather than letting it read global state.
const AUTH_PAGE_THEME = 'white';

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

// The code is not a closed set -- api.js returns its own values
// (network_error, redirected, invalid_response, missing_tokens, storage_error)
// but falls back to the backend's `data.error` on a non-ok response, which is
// server-controlled. Clamp it to an identifier shape and length rather than
// rendering whatever arrives; none of the real values leak anything, but the
// UI should not be a passthrough for arbitrary server text.
const ssoErrorWithCode = (code) => {
  const safe = String(code ?? '').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 40);
  return safe ? `${strings.ssoErrorGeneric} (${safe})` : strings.ssoErrorGeneric;
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
  onEmailSubmitResult(success);
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
  const { interfaceLanguage } = useContext(GlobalStateContext);

  // Analytics flow/attempt bookkeeping. AuthPage remounts (via the `key` on it
  // in ReaderApp.js) on every login <-> register switch, so refs created here
  // start a fresh flow each time. Attempt tracking is per-method (email/google/
  // apple) via attemptIdsRef so a new SSO attempt can't clobber an in-flight
  // email attempt's id; currentMethodRef is the fallback method used when
  // fireProcessStarted/fireProcessEnded are invoked generically (via the props
  // handed to SSOButtons) -- call sites here that know the method pass it explicitly.
  const family = AUTH_EVENT_FAMILY[authMode];
  const flowIdRef = useRef(generateUUID());
  const attemptIdsRef = useRef({});
  const currentMethodRef = useRef(null);
  const emailAttemptActiveRef = useRef(false);
  const flowOutcomeRef = useRef({ succeeded: false, isNewAccount: undefined });

  useEffect(() => {
    trackEvent(`${family}_flow_started`, source ? { flow_id: flowIdRef.current, source } : { flow_id: flowIdRef.current });
    return () => {
      const outcome = flowOutcomeRef.current;
      const params = { flow_id: flowIdRef.current };
      if (outcome.succeeded) {
        params.status = ANALYTICS_STATUS.SUCCESS;
        if (outcome.isNewAccount !== undefined) { params.is_new_account = outcome.isNewAccount; }
      } else {
        params.status = ANALYTICS_STATUS.FAILURE;
        params.reason = ANALYTICS_REASON.ABANDONED;
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
    attemptIdsRef.current[method] = attemptId;
    currentMethodRef.current = method;
    trackEvent(`${family}_method_chosen`, { flow_id: flowIdRef.current, attempt_id: attemptId, method });
  };

  const fireProcessStarted = (method = currentMethodRef.current) => {
    const attemptId = attemptIdsRef.current[method];
    // Guarded the same way fireProcessEnded is: an event carrying
    // attempt_id: undefined would silently corrupt the funnel, which is worse
    // than the missing bookend that dropping it leaves behind.
    if (!attemptId) { return; }
    trackEvent(`${family}_process_started`, { flow_id: flowIdRef.current, attempt_id: attemptId });
  };

  const fireProcessEnded = ({ status, error, reason }, method = currentMethodRef.current) => {
    const attemptId = attemptIdsRef.current[method];
    if (!attemptId) { return; }
    const params = { flow_id: flowIdRef.current, attempt_id: attemptId, status };
    const truncatedError = truncateForAnalytics(error);
    if (truncatedError !== undefined) { params.error = truncatedError; }
    if (reason) { params.reason = reason; }
    trackEvent(`${family}_process_ended`, params);
    // Only the email attempt uses this flag, so a Google/Apple process_ended
    // can't clobber it.
    if (method === 'email') {
      emailAttemptActiveRef.current = false;
    }
  };

  // Opens an email attempt if one isn't already open. Called from both field
  // focus and submit: focus alone isn't enough because a failed submit clears
  // the active flag, so a retry tap with no new focus needs submit's call too,
  // or it would fire process_ended with a stale attempt_id and no bookend.
  const beginEmailAttempt = () => {
    if (emailAttemptActiveRef.current) { return; }
    emailAttemptActiveRef.current = true;
    fireMethodChosen('email');
    fireProcessStarted('email');
  };

  const handleEmailSubmitResult = (success) => {
    fireProcessEnded(success ? { status: ANALYTICS_STATUS.SUCCESS } : { status: ANALYTICS_STATUS.FAILURE, reason: ANALYTICS_REASON.VALIDATION_FAILED }, 'email');
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
  const theme = getTheme(AUTH_PAGE_THEME);
  const isLogin = authMode === AUTH_MODE.LOGIN;
  const placeholderTextColor = AUTH_PAGE_THEME === "black" ? "#BBB" : "#777";
  const isHeb = interfaceLanguage === 'hebrew';

  const [ssoError, setSsoError] = useState(null);
  const emailCollisionMessage = ssoCollisionMessage(errors.email);

  const handleSSOTokenReceived = async (provider, idToken, userData) => {
    const result = await Sefaria.api.socialLogin(provider, idToken, userData);
    if (result.success) {
      fireProcessEnded({ status: ANALYTICS_STATUS.SUCCESS }, provider);
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
      // enum -- per the analytics field contract. socialLogin distinguishes a
      // failure to reach the server from a failure to store the credentials it
      // returned; reporting either as SERVER_REJECTED would blame the server
      // for a client-side problem.
      fireProcessEnded({ status: ANALYTICS_STATUS.FAILURE, reason: result.analyticsReason || ANALYTICS_REASON.SERVER_REJECTED, error: result.code }, provider);
      if (__DEV__) {
        setSsoError(`SSO backend error [${result.code}]: ${JSON.stringify(result.error).slice(0, 200)}`);
      } else {
        // Outside dev only the failure code reaches the user, never the raw
        // message: server and SDK messages are long, device-specific and not
        // written to be read by users. The code is still enough to tell
        // DEVELOPER_ERROR from a network failure in a bug report. Same applies
        // to the error path in handleSSOError below.
        setSsoError(ssoErrorWithCode(result.code));
      }
    }
  };

  const handleSSOError = (error) => {
    console.log('SSO Error:', error);
    if (__DEV__) {
      setSsoError(`SSO [${error?.code}] ${error?.message}`);
    } else {
      setSsoError(ssoErrorWithCode(error?.code));
    }
  };

  const mainContent = (
    <ScrollView style={[{flex:1, alignSelf: "stretch"}, theme.mainTextPanel]} contentContainerStyle={{alignItems: "center", paddingBottom: 50}} keyboardShouldPersistTaps='handled'>
      <RainbowBar />
      <View style={{ flex: 1, alignSelf: "stretch", alignItems: "flex-end", marginHorizontal: 10}}>
        <CircleCloseButton onPress={close} themeStr={AUTH_PAGE_THEME} />
      </View>
      <Text style={[styles.pageTitle, theme.text]}>{isLogin ? strings.login : strings.signup}</Text>
      <View style={{flex: 1, alignSelf: "stretch",  marginHorizontal: 37}}>
        <SSOButtons
          authMode={authMode}
          onSSOSuccess={handleSSOTokenReceived}
          onSSOError={handleSSOError}
          onMethodChosen={fireMethodChosen}
          onProcessStarted={fireProcessStarted}
          onProcessEnded={fireProcessEnded}
          theme={theme}
        />
        <OrDivider theme={theme} />
        <SSOErrorBanner error={(ssoError || emailCollisionMessage) ? { message: ssoError || emailCollisionMessage } : null} theme={theme} />
        { isLogin ? null :
          <AuthTextInput
            placeholder={strings.first_name}
            placeholderTextColor={placeholderTextColor}
            error={errors.first_name}
            errorText={errors.first_name}
            onChangeText={setFirstName}
            onFocus={beginEmailAttempt}
            theme={theme}
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
            theme={theme}
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
          theme={theme}
        />
        <AuthTextInput
          placeholder={strings.password}
          placeholderTextColor={placeholderTextColor}
          isPW={true}
          error={errors.password || errors.password1}
          errorText={errors.password || errors.password1}
          onChangeText={setPassword}
          onFocus={beginEmailAttempt}
          theme={theme}
        />
        <ErrorText error={errors.non_field_errors} errorText={errors.non_field_errors} />
        <SystemButton
          isLoading={isLoading}
          onPress={() => { setSsoError(null); beginEmailAttempt(); onSubmit(); }}
          text={isLogin ? strings.login : strings.signup}
          isHeb={isHeb}
          isBlue
          theme={theme}
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
    // TEMPORARY, paired with AUTH_PAGE_THEME above. The page must paint its own
    // background: it sits inside ReaderApp's themed container, so without this
    // it inherits the dark background while its contents render light -- dark
    // text on a dark panel. Note the status bar and bottom tab bar are
    // ReaderApp's chrome, outside this component, and still follow the app
    // theme; a proper dark variant would remove the need for all of this.
    <KeyboardAvoidingView style={[{flex:1, alignSelf: "stretch"}, theme.mainTextPanel]} contentContainerStyle={{alignItems: "center", paddingBottom: 50}} behavior="padding">
      {mainContent}
    </KeyboardAvoidingView>
    :
    <View style={[{flex:1, alignSelf: "stretch"}, theme.mainTextPanel]} contentContainerStyle={{alignItems: "center", paddingBottom: 50}}>
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
  theme,
}) => (
  <GlobalStateContext.Consumer>
    {
      ({ interfaceLanguage }) => (
        <View>
          <TextInput
            style={[
              styles.textInput,
              styles.systemButton,
              styles.boxShadow,
              styles.authTextInput,
              interfaceLanguage === 'hebrew' ? styles.heInt : styles.enInt,
              theme.text,
              theme.mainTextPanel
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
  ssoErrorWithCode,
};
