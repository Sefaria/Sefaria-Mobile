'use strict';

// AuthPage's flow/attempt analytics bookkeeping, extracted so the main
// login/register screen and ForgotPasswordScreen.js can share ONE funnel
// (same flow_id, same attempt_id space) instead of each minting their own.
// Instantiate this once per AuthPage render and pass the returned functions
// down as props -- never re-instantiate it inside ForgotPasswordScreen.

import { useRef, useState, useEffect } from 'react';
import { trackEvent } from './analytics/events';
import { AUTH_EVENT, truncateForAnalytics, generateUUID } from './analytics/authEvents';
import { AUTH_MODE, AUTH_FLOW_INTENT_BY_MODE, ANALYTICS_STATUS, ANALYTICS_OUTCOME, ANALYTICS_REASON } from './AuthConstants';

const useAuthAnalytics = (authMode, source) => {
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

  const [ssoError, setSsoError] = useState(null);

  // Success derivation for email/password and the SSO undefined-is_new_account
  // fallback share this rule: sign-up mode created an account, login mode
  // signed an existing one in.
  const deriveOutcomeFromAuthMode = () => (authMode === AUTH_MODE.REGISTER ? ANALYTICS_OUTCOME.CREATED_NEW_ACCOUNT : ANALYTICS_OUTCOME.EXISTING_USER_LOGIN);

  useEffect(() => {
    // Forgot-password isn't part of the auth_* funnel (see ForgotPasswordScreen)
    // -- skip both flow-level bookends for it. Its own SSO taps still emit their
    // normal attempt-level events via useSSOSignIn.
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

  return {
    deriveOutcomeFromAuthMode,
    fireMethodChosen,
    fireProcessStarted,
    fireProcessEnded,
    beginEmailAttempt,
    handleEmailSubmitResult,
    flowOutcomeRef,
    ssoError,
    setSsoError,
  };
};

export default useAuthAnalytics;
