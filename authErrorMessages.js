'use strict';

import strings from './LocalizedStrings';
import { SSO_PROVIDER, AUTH_ERROR_CODE, SSO_ERROR_CODE, APPLE_ERROR_CODE_UNKNOWN } from './AuthConstants';

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
// through to null and get treated as an unrendered error by AuthPage's
// hasUnrenderedEmailError.
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
// AuthPage's handleSSOTokenReceived/handleSSOError), and the __DEV__ branches at
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

export { ssoCollisionMessage, ssoOnlyAccountMessage, ssoErrorWithCode };
