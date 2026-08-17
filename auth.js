'use strict';

/**
 * Auth surface for the app: SSO/social sign-in, email login/register, JWT
 * storage in the OS keychain, token refresh, and the one-time migration off
 * the legacy AsyncStorage token.
 *
 * This module is a plain object of methods that api.js spreads into
 * `Sefaria.api`, so every existing `Sefaria.api.<authMethod>` call site keeps
 * working unchanged. Methods therefore still call each other through
 * `Sefaria.api.*` rather than through a local reference -- that indirection is
 * what lets tests stub individual methods, so don't "clean it up".
 *
 * Nothing here imports api.js: the only thing it needs from the api object
 * (`_baseHost`) is read off the global `Sefaria` at call time, which keeps the
 * two modules acyclic.
 *
 * NOTE: `Sefaria.api._baseHost` ends with a trailing slash and every endpoint
 * below is concatenated with NO leading slash. Keep that convention.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { getCrashlytics, recordError } from '@react-native-firebase/crashlytics';
import jwt_decode from 'jwt-decode';
import { devLog } from './devUtils';
import { SSO_PROVIDER, AUTH_MODE, ANALYTICS_REASON, SSO_ERROR_CODE, AUTH_ERROR_CODE } from './AuthConstants';

// Tokens live in OS-backed secure storage (Keychain/Keystore), not plaintext
// AsyncStorage. Changing AUTH_KEYCHAIN_SERVICE orphans every stored credential
// with no migration path.
const AUTH_KEYCHAIN_SERVICE = 'org.sefaria.auth';
const AUTH_KEYCHAIN_USERNAME = 'sefaria_auth';
// Legacy AsyncStorage key auth tokens lived under before the move to the keychain.
const LEGACY_AUTH_ASYNC_STORAGE_KEY = 'auth';

// Maps each SSO provider to its endpoint and request body shape. Looked up
// explicitly so an unrecognized provider fails loudly instead of silently
// falling through to another provider's endpoint.
const SSO_PROVIDER_CONFIG = {
  [SSO_PROVIDER.GOOGLE]: {
    endpoint: 'api/auth/google/mobile',
    buildBody: (idToken) => ({ id_token: idToken }),
  },
  [SSO_PROVIDER.APPLE]: {
    endpoint: 'api/auth/apple/mobile',
    buildBody: (idToken, userData) => ({
      id_token: idToken,
      first_name: userData?.firstName,
      last_name: userData?.lastName,
    }),
  },
};

// In-memory short-circuit for the legacy-token migration, which otherwise runs
// an AsyncStorage read on every expired-token refresh for the life of the
// session.
//
// Semantics: true means "the legacy key is confirmed gone" -- either it was
// never there, or its contents were successfully written to the keychain and
// the legacy copy was then deleted. It is deliberately NOT set when the
// keychain write FAILS (locked device, etc.): in that case the legacy copy is
// still on disk on purpose, and the migration must stay retryable on the next
// read. Setting this flag unconditionally would strand such a user with a
// token that never makes it into the keychain.
let _legacyAuthMigrationComplete = false;

const Auth = {
  deleteUserAccount: async function() {
    await Sefaria.api.getAuthToken();
    if (!Sefaria._auth.uid) { console.log("Not signed in"); return; }
    const url = `${Sefaria.api._baseHost}api/account/delete`;
    fetch(url, {
      method: "DELETE",
      headers: {
        'Authorization': `Bearer ${Sefaria._auth.token}`,
        "Content-Type": "application/json;charset=UTF-8",
      },
    }).then(response => {
      if (response.status >= 200 && response.status < 300) {
        return response;
      } else {
        console.error('Error in response code', response.text());
        throw new Error("Bad Response Code " + response.status);
      }
    })
    .then(response => response.json())
    .then(json => {
      if ("error" in json) {
        console.error('Error in response json', json.error);
        throw new Error("Bad Response " + json.error);
      }else{
        return json;
      }
    })
    .catch(e => {
      console.error('Network Error', e);
      throw new Error("Network Error " + e);
    });
  },

  login: function(authData) {
    const url = `${Sefaria.api._baseHost}api/login/`;
    const authBody = {
      username: authData.email,
      password: authData.password,
    };
    return fetch(url, {
      method: "POST",
      body: JSON.stringify(authBody),
      headers: {
        "Content-Type": "application/json;charset=UTF-8"
      }
    });
  },
  register: function(authData) {
    const url = `${Sefaria.api._baseHost}api/register/`;
    const authBody = {
      email: authData.email,
      first_name: authData.first_name,
      last_name: authData.last_name,
      password1: authData.password,
      password2: authData.password,
      mobile_app_key: authData.mobile_app_key,
    };
    return fetch(url, {
      method: "POST",
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: Sefaria.api.urlFormEncode(authBody)
    });
  },
  socialLoginRequest: function(provider, idToken, userData) {
    const config = SSO_PROVIDER_CONFIG[provider];
    const url = `${Sefaria.api._baseHost}${config.endpoint}`;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify(config.buildBody(idToken, userData)),
    });
  },
  // `analyticsError` is the ANALYTICS_REASON fallback AuthPage reports as the
  // analytics `error` field when `code` itself isn't a usable value (e.g. the
  // SERVER_REJECTED path below, where `code` is `data.error` and may be absent).
  _socialLoginFailure: function(code, analyticsError, error) {
    return { success: false, code, analyticsError, error };
  },
  // Shared machinery behind socialLogin and requestPasswordReset: fire the
  // request, guard against a redirect silently downgrading POST to GET,
  // read the body as text, then parse it as JSON -- classifying a failure at
  // any stage via `failureFactory` instead of throwing, so callers can just
  // `await` this and branch on `result.failure`. Each stage is caught on its
  // own so a client-side failure (network, parsing) isn't reported as an
  // indistinguishable single error, and wording/labelling stays specific to
  // the caller via the `messages`/`label` options.
  //
  // Compared by URL rather than via the standard `response.redirected`
  // because React Native's fetch is the whatwg-fetch polyfill (3.6.x), whose
  // Response never assigns `redirected` -- reading it always yields
  // undefined, so that check would silently never fire on device.
  //
  // `allowEmptyBody` lets requestPasswordReset treat a bare 200 with no body
  // as `{}` instead of a JSON-parse failure; socialLogin always expects a body.
  // `sendRequest` is a thunk, not a promise: it must be INVOKED inside the try
  // below so a synchronous throw is classified like a rejection. Passing an
  // already-created promise would evaluate it at the call site, outside any
  // try, and a sync throw would escape the classify-don't-throw contract.
  _postAndReadJson: async function(sendRequest, url, { label, messages, failureFactory, allowEmptyBody = false }) {
    let response;
    try {
      response = await sendRequest();
    } catch (error) {
      recordError(getCrashlytics(), error);
      return { failure: failureFactory(SSO_ERROR_CODE.NETWORK_ERROR, ANALYTICS_REASON.NETWORK_ERROR, { non_field_errors: messages.requestError(error) }) };
    }

    if (response.url && response.url !== url) {
      devLog(`${label} followed a redirect: ${url} -> ${response.url} (HTTP ${response.status})`);
      return { failure: failureFactory(SSO_ERROR_CODE.REDIRECTED, ANALYTICS_REASON.INVALID_RESPONSE, { non_field_errors: messages.redirected(response) }) };
    }

    let rawBody;
    try {
      rawBody = await response.text();
    } catch (error) {
      recordError(getCrashlytics(), error);
      return { failure: failureFactory(SSO_ERROR_CODE.NETWORK_ERROR, ANALYTICS_REASON.NETWORK_ERROR, { non_field_errors: messages.readError(error) }) };
    }

    let data = allowEmptyBody ? {} : undefined;
    if (!allowEmptyBody || rawBody) {
      try {
        data = JSON.parse(rawBody);
      } catch (error) {
        const snippet = rawBody.replace(/\s+/g, ' ').trim().slice(0, 120);
        devLog(`${label} non-JSON response: ${response.status} from ${url} :: ${snippet}`);
        recordError(getCrashlytics(), error);
        return { failure: failureFactory(SSO_ERROR_CODE.INVALID_RESPONSE, ANALYTICS_REASON.INVALID_RESPONSE, { non_field_errors: messages.nonJson(response, snippet) }) };
      }
    }

    // Valid JSON doesn't guarantee an object -- `null`, a number, or a string
    // all parse successfully, and reading fields off those would throw.
    if (data === null || typeof data !== 'object') {
      return { failure: failureFactory(SSO_ERROR_CODE.INVALID_RESPONSE, ANALYTICS_REASON.INVALID_RESPONSE, { non_field_errors: `Server returned an unexpected response body (HTTP ${response.status})` }) };
    }

    return { response, data };
  },
  socialLogin: async function(provider, idToken, userData) {
    const config = SSO_PROVIDER_CONFIG[provider];
    if (!config) {
      return Sefaria.api._socialLoginFailure(
        SSO_ERROR_CODE.INVALID_RESPONSE,
        ANALYTICS_REASON.INVALID_RESPONSE,
        { non_field_errors: `Unsupported SSO provider: ${provider}` },
      );
    }
    const url = `${Sefaria.api._baseHost}${config.endpoint}`;

    const result = await Sefaria.api._postAndReadJson(
      () => Sefaria.api.socialLoginRequest(provider, idToken, userData),
      url,
      {
        label: 'socialLogin',
        failureFactory: Sefaria.api._socialLoginFailure,
        messages: {
          requestError: (error) => `Network error during sign-in: ${error?.message}`,
          redirected: (response) => `Request was redirected (${url} -> ${response.url}). A redirect downgrades POST to GET, so it cannot reach the sign-in endpoint.`,
          readError: (error) => `Network error reading sign-in response: ${error?.message}`,
          nonJson: (response, snippet) => `Server returned a non-JSON response (HTTP ${response.status} from ${url}): ${snippet}`,
        },
      },
    );
    if (result.failure) { return result.failure; }
    const { response, data } = result;

    if (!response.ok) {
      // data.error is server-controlled and not guaranteed to be a scalar --
      // Django form errors on a nested field (e.g. {"email": ["Already in
      // use"]}) arrive as an object. Putting that straight into `code` would
      // make truncateForAnalytics's String(value) emit the literal
      // "[object Object]" into analytics, and the same value would reach the
      // user via ssoErrorWithCode in AuthPage. Only adopt it as `code` when
      // it's actually a string or number; otherwise fall back to the same
      // INVALID_RESPONSE code used elsewhere in this function for an
      // unexpected response shape. The raw value is untouched in `data`,
      // still passed through as the third arg for __DEV__ display.
      const isScalarErrorCode = typeof data.error === 'string' || typeof data.error === 'number';
      return Sefaria.api._socialLoginFailure(
        isScalarErrorCode ? data.error : SSO_ERROR_CODE.INVALID_RESPONSE,
        ANALYTICS_REASON.SERVER_REJECTED,
        data,
      );
    }
    if (!data.access || !data.refresh) {
      // A 2xx with no tokens is not a successful sign-in.
      return Sefaria.api._socialLoginFailure(SSO_ERROR_CODE.MISSING_TOKENS, ANALYTICS_REASON.INVALID_RESPONSE, data);
    }

    try {
      await Sefaria.api.storeAuthToken(data);
    } catch (error) {
      // Sign-in succeeded but there's nowhere to keep the credentials.
      recordError(getCrashlytics(), error);
      return Sefaria.api._socialLoginFailure(
        SSO_ERROR_CODE.STORAGE_ERROR,
        ANALYTICS_REASON.STORAGE_ERROR,
        { non_field_errors: `Could not store credentials: ${error?.message}` },
      );
    }

    // Prefer the ID token's (server-verified) email over userData.email: Apple
    // only returns an email on the user's very first authorization, so later
    // sign-ins would otherwise store an undefined email.
    let tokenEmail;
    try {
      tokenEmail = jwt_decode(idToken)?.email;
    } catch (error) {
      tokenEmail = undefined;
    }
    return {
      success: true,
      email: tokenEmail || userData?.email,
      ...(data.is_new_account !== undefined ? { is_new_account: data.is_new_account } : {}),
    };
  },
  requestPasswordResetRequest: function(email) {
    const url = `${Sefaria.api._baseHost}api/auth/password/reset`;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify({ email }),
    });
  },
  // `analyticsError` mirrors _socialLoginFailure's fallback role: the
  // ANALYTICS_REASON AuthPage reports when `code` alone isn't a usable
  // low-cardinality value.
  _requestPasswordResetFailure: function(code, analyticsError, error, extra = {}) {
    return { success: false, code, analyticsError, error, ...extra };
  },
  // POST api/auth/password/reset (sso/views.py::password_reset_api). Like
  // socialLogin, classifies failures (network/sso_only_account/other) into a
  // returned shape rather than throwing, so callers switch instead of catching.
  requestPasswordReset: async function(email) {
    const url = `${Sefaria.api._baseHost}api/auth/password/reset`;

    const result = await Sefaria.api._postAndReadJson(
      () => Sefaria.api.requestPasswordResetRequest(email),
      url,
      {
        label: 'requestPasswordReset',
        failureFactory: Sefaria.api._requestPasswordResetFailure,
        // A bare 200 {} success body has no JSON worth parsing.
        allowEmptyBody: true,
        messages: {
          requestError: (error) => `Network error requesting password reset: ${error?.message}`,
          redirected: (response) => `Request was redirected (${url} -> ${response.url}). A redirect downgrades POST to GET, so it cannot reach the reset endpoint.`,
          readError: (error) => `Network error reading password reset response: ${error?.message}`,
          nonJson: (response, snippet) => `Server returned a non-JSON response (HTTP ${response.status} from ${url}): ${snippet}`,
        },
      },
    );
    if (result.failure) { return result.failure; }
    const { response, data } = result;

    if (!response.ok) {
      // The sso_only_account contract (shared with api/login/, see
      // AUTH_ERROR_CODE in AuthConstants.js) arrives under `_auth` here too --
      // surfaced as its own code + providers list so the UI can show a working
      // SSO button instead of the generic error.
      if (data._auth?.code === AUTH_ERROR_CODE.SSO_ONLY_ACCOUNT) {
        return Sefaria.api._requestPasswordResetFailure(
          AUTH_ERROR_CODE.SSO_ONLY_ACCOUNT,
          ANALYTICS_REASON.SERVER_REJECTED,
          data,
          { providers: Array.isArray(data._auth.providers) ? data._auth.providers : [] },
        );
      }
      // Same scalar guard as socialLogin: a non-scalar data.error (a nested
      // Django form-error object) must not become `code`, or it reaches
      // analytics as the literal string "[object Object]".
      const isScalarErrorCode = typeof data.error === 'string' || typeof data.error === 'number';
      return Sefaria.api._requestPasswordResetFailure(
        isScalarErrorCode ? data.error : SSO_ERROR_CODE.INVALID_RESPONSE,
        ANALYTICS_REASON.SERVER_REJECTED,
        data,
      );
    }

    return { success: true };
  },
  refreshToken: function(refreshToken) {
    const url = `${Sefaria.api._baseHost}api/login/refresh/`;
    const authBody = {
      refresh: refreshToken,
    };
    return fetch(url, {
      method: "POST",
      body: JSON.stringify(authBody),
      headers: {
        "Content-Type": "application/json;charset=UTF-8"
      }
    });
  },
  authenticate: async function(authData, authMode = AUTH_MODE.LOGIN) {
    try {
      const parsedRes = await (authMode === AUTH_MODE.LOGIN ? Sefaria.api.login(authData) : Sefaria.api.register(authData)).then(res => res.json());
      if (!parsedRes.access) {
        return parsedRes;  // return errors
      } else if (!parsedRes.refresh) {
        // A 2xx response with an access token but no refresh token must not be
        // treated as a successful login -- surface it as a field error instead.
        return { non_field_errors: "Missing authentication tokens" };
      } else {
        await Sefaria.api.storeAuthToken(parsedRes);
      }
    } catch (error) {
      recordError(getCrashlytics(), error);
      return {
        non_field_errors: "Unknown authentication error"
      };
    }

  },

  storeAuthToken: async function({ access, refresh }) {
    const decodedToken = jwt_decode(access);
    Sefaria._auth = {
      token: access,
      expires: decodedToken.exp,
      uid: decodedToken.user_id,
      refreshToken: refresh,
    };
    // AFTER_FIRST_UNLOCK (rather than the WHEN_UNLOCKED default) so a
    // background token refresh can still write to the keychain while the
    // device is locked -- WHEN_UNLOCKED would fail that write outright.
    await Keychain.setGenericPassword(AUTH_KEYCHAIN_USERNAME, JSON.stringify(Sefaria._auth), { service: AUTH_KEYCHAIN_SERVICE, accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK });
  },

  // One-time migration of auth tokens from legacy AsyncStorage into the
  // keychain, so already-logged-in users aren't signed out on upgrade.
  //
  // Reached from app init (hydrateAuthFromKeychain) AND from every
  // expired-token refresh (getAuthToken), which is why it short-circuits on
  // _legacyAuthMigrationComplete -- see that flag's declaration for why it is
  // only set on a definitive outcome and never after a failed keychain write.
  // Wrapped in a top-level try/catch (unlike the specific JSON/keychain
  // failures below, which are handled on purpose) so an unexpected AsyncStorage
  // rejection can't escape this function -- callers rely on it never throwing.
  _migrateLegacyAuthToken: async function() {
    if (_legacyAuthMigrationComplete) { return; }
    try {
      const legacyAuth = await AsyncStorage.getItem(LEGACY_AUTH_ASYNC_STORAGE_KEY);
      // Nothing to migrate, now or ever: no legacy key exists.
      if (!legacyAuth) { _legacyAuthMigrationComplete = true; return; }
      let parsedLegacyAuth;
      try {
        parsedLegacyAuth = JSON.parse(legacyAuth);
      } catch (error) {
        // Malformed legacy value -- nothing recoverable, drop it.
        await AsyncStorage.removeItem(LEGACY_AUTH_ASYNC_STORAGE_KEY);
        _legacyAuthMigrationComplete = true;
        return;
      }
      if (!parsedLegacyAuth || !parsedLegacyAuth.token) {
        await AsyncStorage.removeItem(LEGACY_AUTH_ASYNC_STORAGE_KEY);
        _legacyAuthMigrationComplete = true;
        return;
      }
      // A keychain entry already existing means credentials got there some
      // other way (e.g. a fresh sign-in) since this legacy blob was written --
      // migrating now would overwrite those newer credentials with the stale
      // legacy ones, so just drop the legacy copy instead.
      const existing = await Keychain.getGenericPassword({ service: AUTH_KEYCHAIN_SERVICE });
      if (existing) {
        await AsyncStorage.removeItem(LEGACY_AUTH_ASYNC_STORAGE_KEY);
        _legacyAuthMigrationComplete = true;
        return;
      }
      // Only drop the legacy copy once the keychain write succeeds, so a failed
      // write (e.g. locked device) can retry on the next read.
      try {
        await Keychain.setGenericPassword(AUTH_KEYCHAIN_USERNAME, JSON.stringify(parsedLegacyAuth), { service: AUTH_KEYCHAIN_SERVICE, accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK });
      } catch (error) {
        // Deliberately leave _legacyAuthMigrationComplete false: the legacy copy
        // is still on disk and this must be retried on the next read.
        return;
      }
      await AsyncStorage.removeItem(LEGACY_AUTH_ASYNC_STORAGE_KEY);
      _legacyAuthMigrationComplete = true;
    } catch (error) {
      // Unexpected AsyncStorage/Keychain failure -- leave migration retryable
      // and don't let this bubble into callers that assume it never throws.
      recordError(getCrashlytics(), error);
    }
  },

  // Rehydrates Sefaria._auth from the Keychain (sole source of truth for the
  // session). Call once during app init; never throws, degrades to logged-out.
  hydrateAuthFromKeychain: async function() {
    // _migrateLegacyAuthToken no longer throws (it catches internally), but
    // guard the call anyway so this function's "never throws" contract holds
    // even if that changes later.
    try {
      await Sefaria.api._migrateLegacyAuthToken();
    } catch (error) {
      recordError(getCrashlytics(), error);
    }
    try {
      const credentials = await Keychain.getGenericPassword({ service: AUTH_KEYCHAIN_SERVICE });
      Sefaria._auth = (credentials && JSON.parse(credentials.password)) || {};
    } catch (error) {
      recordError(getCrashlytics(), error);
      Sefaria._auth = {};
    }
    if (!Sefaria._auth.uid) { return false; /* logged out */ }
    // If the token is expired (or otherwise invalid), getAuthToken() will
    // walk the refresh-token path itself, clearing auth storage only on a
    // genuine server rejection -- a network failure there leaves the existing
    // session (and Sefaria._auth) untouched, so cold start offline keeps the
    // user signed in instead of logging them out.
    await Sefaria.api.getAuthToken();
    return !!Sefaria._auth.uid;
  },

  getAuthToken: async function() {
    if (!Object.keys(Sefaria._auth).length) { return; /* logged out */ }
    const currTime = Sefaria.util.epoch_time();
    if (!Sefaria._auth.token || Sefaria._auth.expires <= currTime) {
      // Cheap no-op once the migration has a definitive outcome; still retries
      // for the one case that needs it (keychain write previously failed).
      // Guarded so this function's rejection surface doesn't grow to include
      // migration's AsyncStorage calls.
      try {
        await Sefaria.api._migrateLegacyAuthToken();
      } catch (error) {
        recordError(getCrashlytics(), error);
      }
      try {
        const credentials = await Keychain.getGenericPassword({ service: AUTH_KEYCHAIN_SERVICE });
        Sefaria._auth = (credentials && JSON.parse(credentials.password)) || {};
        if (!Sefaria._auth.token) { throw new Error("no token!"); }
        if (Sefaria._auth.expires <= currTime) { throw new Error("expired token"); }
        return;  // token is valid
      } catch (error) {
        // Covers a stale/expired/missing token as well as a Keychain read
        // failure (locked device, corrupt entry) -- in every case, fall back
        // to attempting a refresh with whatever refreshToken we last had.
        let parsedRes;
        try {
          const refreshRes = await Sefaria.api.refreshToken(Sefaria._auth.refreshToken);
          parsedRes = await refreshRes.json();
        } catch (refreshError) {
          // The refresh request itself failed (offline, timeout) or came back
          // non-JSON (e.g. a captive portal's HTML) -- the server never
          // actually rejected the refresh token, so this is NOT a sign-out.
          // Keep the existing (possibly stale) session and let the next
          // getAuthToken() call retry.
          return;
        }
        if (!parsedRes.access) {
          // The server responded and genuinely rejected the refresh token --
          // this is the real sign-out path.
          await Sefaria.api.clearAuthStorage();
        } else {
          try {
            await Sefaria.api.storeAuthToken(parsedRes);
          } catch (storeError) {
            // A locked-device keychain write failure here shouldn't make
            // getAuthToken() reject -- the refreshed token just doesn't
            // persist this time; Sefaria._auth is still updated in memory by
            // storeAuthToken before the write, so the session keeps working
            // for the rest of this app session.
            recordError(getCrashlytics(), storeError);
          }
        }
      }
    }
  },
  clearAuthStorage: async function() {
    try {
      await Keychain.resetGenericPassword({ service: AUTH_KEYCHAIN_SERVICE });
    } catch (error) {
      // Keep clearing app-level state even if the OS-level reset fails, so
      // callers reading Sefaria._auth right after this resolves see the
      // logged-out state consistently instead of racing the reset.
      recordError(getCrashlytics(), error);
    }
    await AsyncStorage.removeItem(LEGACY_AUTH_ASYNC_STORAGE_KEY);
    await AsyncStorage.removeItem('lastSyncTime');
    await AsyncStorage.removeItem('lastSettingsUpdateTime');
    await AsyncStorage.removeItem('hasDismissedSyncModal');
    await AsyncStorage.removeItem('hasSyncedOnce');
    await AsyncStorage.removeItem('hasSwipeDeleted');
    Sefaria._auth = {};
    Sefaria.history._hasSwipeDeleted = false;
    const hasSyncedOnce = Sefaria.history._hasSyncedOnce;
    Sefaria.history._hasSyncedOnce = false;
    if (!hasSyncedOnce) { return; /* dont fully delete data if not backed up */}

    Sefaria.history.deleteHistory(true);
  },
};

export {
  AUTH_KEYCHAIN_SERVICE,
  AUTH_KEYCHAIN_USERNAME,
  LEGACY_AUTH_ASYNC_STORAGE_KEY,
  SSO_PROVIDER_CONFIG,
};

export default Auth;
