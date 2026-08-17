'use strict';

import React, { useState, useContext } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  ScrollView,
  Text,
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
import useSSOSignIn from './useSSOSignIn';
import { AUTH_MODE, ANALYTICS_STATUS, ANALYTICS_REASON } from './AuthConstants';
import { ssoCollisionMessage, ssoOnlyAccountMessage, ssoErrorWithCode } from './authErrorMessages';
import { AuthTextInput, ErrorText } from './AuthTextInput';
import useAuthAnalytics from './useAuthAnalytics';
import { ForgotPasswordScreen, FORGOT_PASSWORD_VIEW, forgotPasswordViewForResult, forgotPasswordBannerError } from './ForgotPasswordScreen';

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

// Field keys AuthPage already has a dedicated <AuthTextInput>/<ErrorText>
// surface for. See hasUnrenderedEmailError below for why this exists.
// first_name/last_name render under their own register-only inputs;
// password2 (Django's UserCreationForm._post_clean attaches password-strength
// failures there, not to password/password1) renders folded into the
// password input alongside password/password1 -- see that AuthTextInput below.
// Omitting any of these here doesn't just lose that field's message, it also
// trips hasUnrenderedEmailError and adds a contradictory generic banner on
// top of the correct inline error.
const KNOWN_EMAIL_ERROR_FIELDS = ['email', 'username', 'password', 'password1', 'password2', 'first_name', 'last_name', 'non_field_errors'];

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

const AuthPage = ({ authMode, close, showToast, openLogin, openRegister, openForgotPassword, openUri, syncProfile, source }) => {
  const dispatch = useContext(DispatchContext);
  const { interfaceLanguage } = useContext(GlobalStateContext);

  const {
    deriveOutcomeFromAuthMode,
    fireMethodChosen,
    fireProcessStarted,
    fireProcessEnded,
    beginEmailAttempt,
    handleEmailSubmitResult,
    flowOutcomeRef,
    ssoError,
    setSsoError,
  } = useAuthAnalytics(authMode, source);

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

  const emailCollisionMessage = ssoCollisionMessage(errors.email);
  // api/login/'s sso_only_account contract (see ssoOnlyAccountMessage above)
  // arrives as `errors._auth`, a key `KNOWN_EMAIL_ERROR_FIELDS` doesn't know
  // about -- so, like emailCollisionMessage, it has to be computed and
  // excluded from hasUnrenderedEmailError BEFORE that check runs, or the
  // generic fallback below would treat `_auth` as just another unrendered
  // field and mask this more specific message with "something went wrong".
  const ssoOnlyAccountErrorMessage = ssoOnlyAccountMessage(errors._auth);

  // authenticate() (auth.js) forwards a failed backend response body verbatim
  // as `errors` -- when the body carries some OTHER key, e.g.
  // TokenObtainPairView's bare `detail` on bad login credentials, setErrors(...)
  // succeeds but nothing on screen ever goes truthy, so the failure is
  // invisible. `emailCollisionMessage` and `ssoOnlyAccountErrorMessage` are
  // each handled separately (they already have a banner path) and are
  // excluded here so neither is double-counted.
  const hasUnrenderedEmailError = Object.keys(errors).length > 0
    && !emailCollisionMessage
    && !ssoOnlyAccountErrorMessage
    && !KNOWN_EMAIL_ERROR_FIELDS.some((field) => errors[field]);
  // Reuses SSOErrorBanner rather than adding a new display surface: it's
  // already the catch-all for "something failed and none of the per-field
  // inputs cover it" (see emailCollisionMessage above), so a login-only field
  // error is just another case of the same problem. The backend's `detail`
  // text is never shown -- it's English-only and not written for users.
  const emailGenericErrorMessage = hasUnrenderedEmailError ? strings.ssoErrorGeneric : null;

  // Built once per render, bound to this render's authMode; reused by every
  // SSOButtons control this page renders, including forgot-password's SSO-only
  // state below (see useSSOSignIn.js).
  const onSSOSignInSuccess = useSSOSignIn({
    authMode,
    deriveOutcomeFromAuthMode,
    fireProcessEnded,
    flowOutcomeRef,
    syncProfile,
    close,
    showToast,
  });

  const handleSSOTokenReceived = async (provider, idToken, userData) => {
    const result = await Sefaria.api.socialLogin(provider, idToken, userData);
    if (result.success) {
      onSSOSignInSuccess(provider, result, userData);
    } else {
      // `error` prefers the raw SDK/server error code (result.code); only
      // when that's unusable (e.g. a SERVER_REJECTED response with no
      // data.error) does it fall back to the ANALYTICS_REASON enum value
      // socialLogin already picked for it. socialLogin distinguishes a
      // failure to reach the server from a failure to store the credentials it
      // returned; reporting either as SERVER_REJECTED would blame the server
      // for a client-side problem.
      fireProcessEnded({ status: ANALYTICS_STATUS.FAILURE, error: result.code || result.analyticsError || ANALYTICS_REASON.SERVER_REJECTED }, provider);
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
        {/* Precedence: a live SSO SDK/backend error (ssoError, cleared on every
            submit) outranks the email-path messages below it, since it always
            reflects the most recent attempt. Of the email-path messages,
            emailCollisionMessage (register-time "this email already exists via
            X") and ssoOnlyAccountErrorMessage (login-time "this account IS an
            SSO account") are mutually exclusive in practice -- one comes from
            register_api, the other from api/login/ -- but both are more
            specific than emailGenericErrorMessage and so must be checked first,
            or that catch-all would win and hide them (see
            hasUnrenderedEmailError above). */}
        <SSOErrorBanner error={(ssoError || emailCollisionMessage || ssoOnlyAccountErrorMessage || emailGenericErrorMessage) ? { message: ssoError || emailCollisionMessage || ssoOnlyAccountErrorMessage || emailGenericErrorMessage } : null} theme={theme} />
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
          // password2 (register's confirm-password field, posted alongside
          // password1 -- see auth.js) is where Django's
          // UserCreationForm._post_clean attaches password-strength failures
          // by default, not password/password1. Folded in here rather than
          // given its own input since there's no separate confirm-password
          // field in this UI to attach it to.
          error={errors.password || errors.password1 || errors.password2}
          errorText={errors.password || errors.password1 || errors.password2}
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

              <TouchableOpacity onPress={openForgotPassword}>
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

  const content = authMode === AUTH_MODE.FORGOT_PASSWORD
    ? (
      <ForgotPasswordScreen
        theme={theme}
        themeStr={AUTH_PAGE_THEME}
        isHeb={isHeb}
        close={close}
        openLogin={openLogin}
        fireMethodChosen={fireMethodChosen}
        fireProcessStarted={fireProcessStarted}
        fireProcessEnded={fireProcessEnded}
        handleSSOTokenReceived={handleSSOTokenReceived}
        handleSSOError={handleSSOError}
        ssoError={ssoError}
        setSsoError={setSsoError}
      />
    )
    : mainContent;

  return(
    Platform.OS == "ios" ?
    // TEMPORARY, paired with AUTH_PAGE_THEME above. The page must paint its own
    // background: it sits inside ReaderApp's themed container, so without this
    // it inherits the dark background while its contents render light -- dark
    // text on a dark panel. Note the status bar and bottom tab bar are
    // ReaderApp's chrome, outside this component, and still follow the app
    // theme; a proper dark variant would remove the need for all of this.
    <KeyboardAvoidingView style={[{flex:1, alignSelf: "stretch"}, theme.mainTextPanel]} contentContainerStyle={{alignItems: "center", paddingBottom: 50}} behavior="padding">
      {content}
    </KeyboardAvoidingView>
    :
    <View style={[{flex:1, alignSelf: "stretch"}, theme.mainTextPanel]} contentContainerStyle={{alignItems: "center", paddingBottom: 50}}>
      {content}
    </View>
  )
}
AuthPage.propTypes = {
  authMode: PropTypes.string.isRequired,
  close:    PropTypes.func.isRequired,
  showToast:PropTypes.func.isRequired,
  openLogin: PropTypes.func.isRequired,
  openRegister: PropTypes.func.isRequired,
  openForgotPassword: PropTypes.func.isRequired,
  openUri: PropTypes.func.isRequired,
  // How the user reached this page (nav_bar, la_banner, etc.), passed down
  // from ReaderApp's openMenu(menu, via). Omitted (null) when AuthPage was
  // reached without a `via`, e.g. switching between login <-> register.
  source: PropTypes.string,
};

export {
  AuthPage,
  AuthTextInput,
  ssoCollisionMessage,
  ssoErrorWithCode,
  ssoOnlyAccountMessage,
  FORGOT_PASSWORD_VIEW,
  forgotPasswordViewForResult,
  forgotPasswordBannerError,
};
