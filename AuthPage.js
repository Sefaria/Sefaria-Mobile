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
import { AUTH_EVENT, truncateForAnalytics, generateUUID } from './analytics/authEvents';
import { SSOButtons, OrDivider, createGoogleSignInHandler, createAppleSignInHandler } from './SSOButtons';
import SSOErrorBanner from './SSOErrorBanner';
import useSSOSignIn from './useSSOSignIn';
import { AUTH_MODE, AUTH_FLOW_INTENT_BY_MODE, ANALYTICS_STATUS, ANALYTICS_OUTCOME, ANALYTICS_REASON, SSO_ERROR_CODE, SSO_PROVIDER, AUTH_ERROR_CODE, APPLE_ERROR_CODE_UNKNOWN } from './AuthConstants';

// Exact-match map from the backend's English collision sentences (raised by
// SefariaNewUserForm.clean_email on the register path) to the localized string
// *key* that should be shown for each. Values are key names rather than
// `strings.x` snapshots because `strings` is re-localized at runtime when the
// interface language changes -- capturing `strings.x` here at module load
// would freeze these messages in whatever language was active on first import.
// Same three sentences web's RegisterView.jsx maps -- but web now matches stable error
// codes (sso_google_exists/sso_apple_exists/email_exists) via register_api's sibling
// endpoint (_web_register_errors), not this text. This app talks to register_api instead,
// which has no such code-based indirection, so this still depends on clean_email's messages
// staying un-translated (see the comment there) until this map gets the same code-based fix.
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

// Maps api/login/'s `_auth` payload (sso_only_account, see AUTH_ERROR_CODE in
// AuthConstants.js) to the localized message naming which provider(s) the
// account is actually linked to. This is the SAME contract web's session-login
// path returns from _sso_only_account_error (sso/views.py) -- keep this
// mapping in sync with that function's provider list, not just with this
// file's own history.
//
// `providers` is documented as a set (order not guaranteed), so this is
// membership tests rather than array-position logic, and it's read defensively
// throughout: `_auth` can be absent (any other login failure), and `providers`
// can be missing or empty even when the code IS sso_only_account (e.g. a user
// whose linked-account bookkeeping is in a state the backend doesn't have a
// specific provider name for). Both of those still deserve the "this is an
// SSO-only account" message, just the generic phrasing -- they must not fall
// through to null and get treated as an unrendered error by
// hasUnrenderedEmailError below.
const ssoOnlyAccountMessage = (auth) => {
  if (!auth || auth.code !== AUTH_ERROR_CODE.SSO_ONLY_ACCOUNT) { return null; }
  const providers = new Set(Array.isArray(auth.providers) ? auth.providers : []);
  const hasGoogle = providers.has(SSO_PROVIDER.GOOGLE);
  const hasApple = providers.has(SSO_PROVIDER.APPLE);
  if (hasGoogle && hasApple) { return strings.ssoEmailExistsAppleAndGoogle; }
  if (hasGoogle) { return strings.ssoEmailExistsGoogle; }
  if (hasApple) { return strings.ssoEmailExistsApple; }
  // Falls back to the generic SSO-error string rather than
  // strings.ssoEmailExistsGeneric: that string is register-path collision
  // copy ("An account with this email address already exists.") and carries
  // no SSO signal, which is actively misleading on a login screen -- it tells
  // the user their account exists but gives no hint that they need to use a
  // social sign-in button. ssoErrorGeneric is less specific but not
  // misleading. The correct end state is a dedicated "this account uses
  // social sign-in" string; that's product copy Penina needs to write
  // (Hebrew included), not something to draft here. In practice this branch
  // shouldn't fire today -- the backend only emits sso_only_account when
  // socialaccount_set.exists() is true -- so this is defensive against a
  // future provider mobile doesn't yet recognize.
  return strings.ssoErrorGeneric;
};

// A raw code (network_error, DEVELOPER_ERROR, a clamped server value...) isn't
// something a user can act on, so it no longer reaches the banner -- product
// decision was to replace the old "<generic message> (<code>)" text with
// actionable, human-readable copy instead of exposing a numeric/opaque SDK
// code to the user. Network failures get their own message because there IS
// something the user can do about those (check their connection); everything
// else collapses to the bare generic string. The code itself isn't lost:
// fireProcessEnded still reports it as the analytics `error` field (see
// handleSSOTokenReceived/handleSSOError below), and the __DEV__ branches at
// both call sites still show it verbatim for debugging -- this function is
// only reached on the non-__DEV__ path.
// APPLE_ERROR_CODE_UNKNOWN ('1000', AppleError.UNKNOWN) is included here
// alongside the client-side NETWORK_ERROR code: it's what SSOButtons' Apple
// handler passes through onSSOError as error.code when the SDK's
// performRequest() rejects with no more specific error, and it's the exact
// code from the reported bug ("יש תקלה, נסו שוב 1000"). Apple's own naming
// calls it "unknown", not "network" -- mapping it to the network-error
// message is a deliberate product decision based on observed airplane-mode
// behavior, not a claim about Apple's semantics (see AuthConstants.js).
const ssoErrorWithCode = (code) => (
  (code === SSO_ERROR_CODE.NETWORK_ERROR || code === APPLE_ERROR_CODE_UNKNOWN) ? strings.authErrorNetwork : strings.ssoErrorGeneric
);

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
  if (auth && auth.code === AUTH_ERROR_CODE.SSO_ONLY_ACCOUNT) {
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

  // Analytics flow/attempt bookkeeping. AuthPage remounts (via the `key` on it
  // in ReaderApp.js) on every login <-> register switch, so refs created here
  // start a fresh flow each time. Attempt tracking is per-method (email/google/
  // apple) via attemptIdsRef so a new SSO attempt can't clobber an in-flight
  // email attempt's id; currentMethodRef is the fallback method used when
  // fireProcessStarted/fireProcessEnded are invoked generically (via the props
  // handed to SSOButtons) -- call sites here that know the method pass it explicitly.
  //
  // Mobile has no one-tap flow, so flow_intent is a straight readout of
  // authMode; registration/login are the only two flow_intent values this
  // page ever emits (see AUTH_FLOW_INTENT in AuthConstants.js for the third).
  // Looked up through the explicit AUTH_FLOW_INTENT_BY_MODE map rather than an
  // inline ternary, so an AUTH_MODE added later without a mapping shows up as
  // `undefined` here (and fails the exhaustiveness test) instead of silently
  // reporting `login`.
  const flowIntent = AUTH_FLOW_INTENT_BY_MODE[authMode];
  const flowIdRef = useRef(generateUUID());
  const attemptIdsRef = useRef({});
  const currentMethodRef = useRef(null);
  const emailAttemptActiveRef = useRef(false);
  // Holds exactly what flow_ended needs to emit, resolved as soon as the flow's
  // outcome is known. Starts as the abandonment case so an unmount before any
  // attempt at all (the common "user just closed the page" path) reports
  // correctly with no extra bookkeeping. Every process_ended FAILURE overwrites
  // it with that attempt's error (see fireProcessEnded below), so a user who
  // closes the page after a failed attempt is reported with the real failure
  // reason instead of a generic "abandoned"; a success handler still overwrites
  // it wholesale, taking precedence over any prior failure.
  const flowOutcomeRef = useRef({ status: ANALYTICS_STATUS.FAILURE, error: ANALYTICS_REASON.ABANDONED });

  // Success derivation for email/password and the SSO undefined-is_new_account
  // fallback share this rule: sign-up mode created an account, login mode
  // signed an existing one in.
  const deriveOutcomeFromAuthMode = () => (authMode === AUTH_MODE.REGISTER ? ANALYTICS_OUTCOME.CREATED_NEW_ACCOUNT : ANALYTICS_OUTCOME.EXISTING_USER_LOGIN);

  useEffect(() => {
    // Forgot-password isn't part of the auth_* funnel (see the comment above
    // that section below) -- skip both flow-level bookends for it. Its own SSO
    // taps still emit their normal attempt-level events via useSSOSignIn.
    if (authMode === AUTH_MODE.FORGOT_PASSWORD) { return; }
    trackEvent(AUTH_EVENT.FLOW_STARTED, source ? { flow_id: flowIdRef.current, source, flow_intent: flowIntent } : { flow_id: flowIdRef.current, flow_intent: flowIntent });
    return () => {
      const resolved = flowOutcomeRef.current;
      const params = { flow_id: flowIdRef.current, status: resolved.status };
      const truncatedOutcome = truncateForAnalytics(resolved.outcome);
      if (truncatedOutcome !== undefined) { params.outcome = truncatedOutcome; }
      const truncatedError = truncateForAnalytics(resolved.error);
      if (truncatedError !== undefined) { params.error = truncatedError; }
      trackEvent(AUTH_EVENT.FLOW_ENDED, params);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mints a fresh attempt_id and fires auth_method_chosen. Called for every
  // new provider tap or new email attempt -- never gated behind a "sent once"
  // flag, so retries correctly re-fire.
  const fireMethodChosen = (method) => {
    const attemptId = generateUUID();
    attemptIdsRef.current[method] = attemptId;
    currentMethodRef.current = method;
    trackEvent(AUTH_EVENT.METHOD_CHOSEN, { flow_id: flowIdRef.current, attempt_id: attemptId, method });
  };

  const fireProcessStarted = (method = currentMethodRef.current) => {
    const attemptId = attemptIdsRef.current[method];
    // Guarded the same way fireProcessEnded is: an event carrying
    // attempt_id: undefined would silently corrupt the funnel, which is worse
    // than the missing bookend that dropping it leaves behind.
    if (!attemptId) { return; }
    trackEvent(AUTH_EVENT.PROCESS_STARTED, { flow_id: flowIdRef.current, attempt_id: attemptId });
  };

  const fireProcessEnded = ({ status, outcome, error }, method = currentMethodRef.current) => {
    const attemptId = attemptIdsRef.current[method];
    if (!attemptId) { return; }
    const params = { flow_id: flowIdRef.current, attempt_id: attemptId, status };
    const truncatedOutcome = truncateForAnalytics(outcome);
    if (truncatedOutcome !== undefined) { params.outcome = truncatedOutcome; }
    const truncatedError = truncateForAnalytics(error);
    if (truncatedError !== undefined) { params.error = truncatedError; }
    trackEvent(AUTH_EVENT.PROCESS_ENDED, params);
    if (status === ANALYTICS_STATUS.FAILURE) {
      // Keep the last real failure reason on hand for flow_ended: without
      // this, a failed attempt followed by the user closing the page reports
      // `error: abandoned`, indistinguishable from someone who tapped nothing
      // at all. A later successful attempt still overwrites this wholesale
      // (see the SUCCESS handlers above), so this only ever affects the case
      // where the flow ends without ever succeeding.
      flowOutcomeRef.current = { status: ANALYTICS_STATUS.FAILURE, error };
    }
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
    if (success) {
      const outcome = deriveOutcomeFromAuthMode();
      fireProcessEnded({ status: ANALYTICS_STATUS.SUCCESS, outcome }, 'email');
      flowOutcomeRef.current = { status: ANALYTICS_STATUS.SUCCESS, outcome };
    } else {
      fireProcessEnded({ status: ANALYTICS_STATUS.FAILURE, error: ANALYTICS_REASON.VALIDATION_FAILED }, 'email');
    }
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

  // --- Forgot-password mode (AUTH_MODE.FORGOT_PASSWORD) ---------------------
  // Local to this component -- separate from the login/register form above.
  // Not part of the analytics auth_* FLOW (see the mount effect above), though
  // a provider tap from this screen's banner still emits the normal
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
    authMode,
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

  // The form stays on screen through both FORM and ERROR states (ERROR just
  // adds a banner above the email input). SENT replaces it entirely: title +
  // body only, no button, no "Back to login".
  const forgotPasswordContent = (
    <ScrollView style={[{flex:1, alignSelf: "stretch"}, theme.mainTextPanel]} contentContainerStyle={{alignItems: "center", paddingBottom: 50}} keyboardShouldPersistTaps='handled'>
      <RainbowBar />
      <View style={{ flex: 1, alignSelf: "stretch", alignItems: "flex-end", marginHorizontal: 10}}>
        <CircleCloseButton onPress={close} themeStr={AUTH_PAGE_THEME} />
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

  const content = authMode === AUTH_MODE.FORGOT_PASSWORD ? forgotPasswordContent : mainContent;

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
  ssoOnlyAccountMessage,
  FORGOT_PASSWORD_VIEW,
  forgotPasswordViewForResult,
  forgotPasswordBannerError,
};
