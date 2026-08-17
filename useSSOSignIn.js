'use strict';

import { useContext } from 'react';
import { DispatchContext, STATE_ACTIONS } from './StateManager';
import { trackEvent } from './analytics/events';
import strings from './LocalizedStrings';
import { ANALYTICS_STATUS, ANALYTICS_OUTCOME } from './AuthConstants';

/**
 * Extraction of handleSSOTokenReceived's SUCCESS path from AuthPage.js, so the
 * forgot-password screen's SSO-only state can log a user in exactly the way
 * the login/register screen does, without duplicating that bookkeeping.
 *
 * Deliberately narrow: only the success branch moves here. The failure branch
 * and the socialLogin() call itself stay in AuthPage. The flow/attempt-id refs
 * are the caller's own, passed in and written to exactly as the inline version
 * did -- this hook holds no state of its own beyond the dispatch it reads from
 * context, so one instance built per AuthPage render is safe to reuse across
 * every SSOButtons control that page renders.
 */
const useSSOSignIn = ({ authMode, deriveOutcomeFromAuthMode, fireProcessEnded, flowOutcomeRef, syncProfile, close, showToast }) => {
  const dispatch = useContext(DispatchContext);

  return (provider, result, userData) => {
    // is_new_account is the backend's own field name on the socialLogin
    // response, not the analytics contract -- it maps to the analytics
    // `outcome` enum below. When the backend omits it, fall back to the same
    // authMode-based rule email/password success uses.
    const outcome = result.is_new_account !== undefined
      ? (result.is_new_account ? ANALYTICS_OUTCOME.CREATED_NEW_ACCOUNT : ANALYTICS_OUTCOME.EXISTING_USER_LOGIN)
      : deriveOutcomeFromAuthMode();
    fireProcessEnded({ status: ANALYTICS_STATUS.SUCCESS, outcome }, provider);
    flowOutcomeRef.current = { status: ANALYTICS_STATUS.SUCCESS, outcome };
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
    // try to sync immediately after login
    syncProfile();
    close(authMode);
    showToast(strings.loginSuccessful);
  };
};

export default useSSOSignIn;
