# Mobile SSO Login — Implementation Plan

## Context

The Sefaria web app has working Google and Apple SSO (Phases 1–5 of the web SSO spec). This plan adds native Google and Apple Sign-In to the React Native mobile app. It requires two small backend fixes (JWT in SSO responses, Apple audience check) and mobile-side library + api.js + UI work.

**Status (2026-05-13):** Phases 1–4 (sign-in/registration via Google + Apple on mobile) are shipped. Phase 5 (Account Linking in mobile Settings) is the next iteration, driven by decisions from the 2026-05-11 product meeting (see `product.md` → "Decisions from 2026-05-11 product meeting").

---

## Phase 1: Backend Fixes — ✅ Shipped

### Task 1: Fix Apple audience check to accept iOS bundle ID

**File:** `sso/providers/apple.py`

Replace the hard `== settings.APPLE_SSO_CLIENT_ID` check with a set membership check:

```python
valid_audiences = {settings.APPLE_SSO_CLIENT_ID, settings.APPLE_SSO_IOS_BUNDLE_ID}
if claims.get("aud") not in valid_audiences:
    raise ValueError("Invalid audience")
```

**File:** `sefaria/local_settings.py`

Add:
```python
APPLE_SSO_IOS_BUNDLE_ID = 'org.sefaria.sefaria'
```

**File:** `sefaria/local_settings_example.py`

Document the new setting alongside `APPLE_SSO_CLIENT_ID`.

### Task 2: Return JWT tokens from both SSO callback views

**File:** `sefaria/views.py`

In both `google_sso_callback` and `apple_sso_callback`, after `auth_login(request, user, ...)`:

```python
from rest_framework_simplejwt.tokens import RefreshToken

refresh = RefreshToken.for_user(user)
return jsonResponse({
    "status": "ok",
    "is_new_user": is_new_user,
    "access": str(refresh.access_token),
    "refresh": str(refresh),
})
```

The web ignores `access` and `refresh`; the mobile app reads them.

---

## Phase 2: Mobile Libraries — ✅ Shipped

### Task 3: Install native OAuth packages

```bash
npm install @react-native-google-signin/google-signin
npm install @invertase/react-native-apple-authentication
```

Both packages use React Native autolinking. No manual linking required for RN 0.60+.

### Task 4: Configure iOS native modules

**File:** `ios/Sefaria/Info.plist`

Add the reversed Google OAuth client ID URL scheme so Google Sign-In can complete its redirect flow. The reversed client ID comes from `GoogleService-Info.plist` (`REVERSED_CLIENT_ID` key):

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>$(REVERSED_CLIENT_ID)</string>
    </array>
  </dict>
</array>
```

**Xcode:** Enable the "Sign In with Apple" capability under Signing & Capabilities. This adds the entitlement automatically. Ensure `GoogleService-Info.plist` is present in the Xcode project.

### Task 5: Configure Android

**File:** `android/app/build.gradle`

Confirm `google-services` plugin is applied (already present for Firebase). Ensure `google-services.json` includes an OAuth 2.0 web client entry that matches `GOOGLE_SSO_CLIENT_ID`. Android does not support Apple Sign In — no additional setup needed.

---

## Phase 3: Mobile api.js — ✅ Shipped

### Task 6: Extract `_storeAuthTokens()` and add `googleSSO()` + `appleSSO()`

**File:** `api.js`

Extract the token-decode-and-store pattern from `authenticate()` into a private helper:

```javascript
async _storeAuthTokens(access, refresh) {
  const decodedToken = jwtDecode(access);
  Sefaria._auth = {
    token: access,
    expires: decodedToken.exp,
    uid: decodedToken.user_id,
    refreshToken: refresh,
  };
  await AsyncStorage.setItem('auth', JSON.stringify(Sefaria._auth));
}
```

Add Google SSO method:
```javascript
async googleSSO() {
  await GoogleSignin.hasPlayServices();
  const { data } = await GoogleSignin.signIn();
  const response = await this.doAuthenticate('/api/auth/google/callback', { credential: data.idToken });
  if (response.access) {
    await this._storeAuthTokens(response.access, response.refresh);
    return {};
  }
  return response.error ? { non_field_errors: response.error } : response;
}
```

Add Apple SSO method (iOS only — guarded in the UI):
```javascript
async appleSSO() {
  const appleAuthRequestResponse = await appleAuth.performRequest({
    requestedOperation: appleAuth.Operation.LOGIN,
    requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
  });
  const { identityToken, fullName } = appleAuthRequestResponse;
  const response = await this.doAuthenticate('/api/auth/apple/callback', {
    id_token: identityToken,
    first_name: fullName?.givenName || '',
    last_name: fullName?.familyName || '',
  });
  if (response.access) {
    await this._storeAuthTokens(response.access, response.refresh);
    return {};
  }
  return response.error ? { non_field_errors: response.error } : response;
}
```

Add `doAuthenticate()` — thin fetch wrapper used by both SSO methods and potentially `authenticate()` (avoids duplicating the `fetch` call):
```javascript
async doAuthenticate(path, body) {
  const r = await fetch(Sefaria.api._baseURL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}
```

Initialise Google Sign-In once at startup (in `Sefaria.init()` or the top of the module):
```javascript
GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
```

---

## Phase 4: AuthPage.js UI — ✅ Shipped

### Task 7: Add SSO buttons to AuthPage

**File:** `AuthPage.js`

Add below the existing `SystemButton` (submit), before the login/register toggle text:

```jsx
{/* Divider */}
<View style={styles.orDivider}>
  <View style={styles.orDividerLine} />
  <Text style={[styles.orDividerText, theme.secondaryText]}>or</Text>
  <View style={styles.orDividerLine} />
</View>

{/* Google */}
<GoogleSignInButton onPress={handleGoogleSSO} isLoading={isSSOLoading} />

{/* Apple — iOS only */}
{Platform.OS === 'ios' && (
  <AppleSignInButton onPress={handleAppleSSO} isLoading={isSSOLoading} />
)}
```

SSO handlers follow the same pattern as `onSubmit`: call the api method, check for errors, call `onLoginSuccess` on success, set errors on failure. User-cancelled errors are caught and silently ignored.

---

---

## Phase 5: Account Linking (Login Methods in Settings)

Driven by the 2026-05-11 product meeting. The link/unlink backend endpoints (`/api/auth/link/<provider>` POST and `/api/auth/unlink/<provider>` DELETE) are already shipped — they were added during Phase 1 work. What's missing is (a) a way for mobile to read the user's current linked-providers state, (b) `api.js` methods that wrap link/unlink, and (c) the Settings UI.

### Task 8: Backend — `user_auth_status` endpoint

**File:** `sefaria/views.py`

The data already exists on `request.user.social_identities` — `reader.views.account_settings` reads `request.user.social_identities.values_list("provider", flat=True)` for the web settings page. Mirror that for mobile in a JSON endpoint:

```python
@login_required
@api_view(["GET"])
def user_auth_status(request):
    connected = list(request.user.social_identities.values_list("provider", flat=True))
    return jsonResponse({
        "linked_providers": connected,
        "has_usable_password": request.user.has_usable_password(),
    })
```

**File:** `sefaria/urls_shared.py`

Add next to the existing link/unlink routes:

```python
path('api/auth/status', sefaria_views.user_auth_status, name='user_auth_status'),
```

No new templates, no new migrations.

### Task 9: Mobile api.js — auth status + link/unlink

**File:** `api.js`

Add three methods after `appleSSO`, before `storeAuthToken`. Reuse the existing Bearer-token pattern (`await Sefaria.api.getAuthToken(); ... Authorization: Bearer ${Sefaria._auth.token}`) from `deleteUserAccount`, and reuse the native SDK invocations from `googleSSO`/`appleSSO` to mint a fresh `idToken` for the link call. No `_authHeaders()` helper is introduced — the inline header is a one-liner and two callsites isn't enough to justify abstraction.

```javascript
getAuthStatus: async function() {
  await Sefaria.api.getAuthToken();
  if (!Sefaria._auth.token) return null;
  const res = await fetch(`${Sefaria.api._baseHost}api/auth/status`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${Sefaria._auth.token}` },
  });
  return res.json();   // { linked_providers: string[], has_usable_password: bool }
},

linkProvider: async function(provider) {
  await Sefaria.api.getAuthToken();
  let body;
  try {
    if (provider === 'google') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      if (result.type === 'cancelled') return {};
      const idToken = result.data?.idToken;
      if (!idToken) return { error: "Google sign-in failed: no identity token." };
      body = { credential: idToken };
    } else if (provider === 'apple') {
      if (Platform.OS !== 'ios' || !appleAuth) {
        return { error: "Apple Sign In is only available on iOS." };
      }
      const resp = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
      });
      if (!resp.identityToken) return { error: "Apple sign-in failed: no identity token." };
      body = { id_token: resp.identityToken };
    } else {
      return { error: "Unknown provider." };
    }
  } catch (error) {
    if (error.code === GoogleStatusCodes.SIGN_IN_CANCELLED) return {};
    if (error.code === appleAuth?.Error?.CANCELED) return {};
    return { error: `Sign-in failed: ${error.message || error}` };
  }
  const res = await fetch(`${Sefaria.api._baseHost}api/auth/link/${provider}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Sefaria._auth.token}`,
    },
    body: JSON.stringify(body),
  });
  const parsed = await res.json();
  return parsed.status === 'ok' ? {} : { error: parsed.error };
},

unlinkProvider: async function(provider) {
  await Sefaria.api.getAuthToken();
  const res = await fetch(`${Sefaria.api._baseHost}api/auth/unlink/${provider}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${Sefaria._auth.token}` },
  });
  const parsed = await res.json();
  return parsed.status === 'ok' ? {} : { error: parsed.error };
},
```

Methods return an empty object on success (matching `googleSSO`/`appleSSO`) so the UI layer can use the same `if (errors.error) ... ` pattern.

### Task 10: Mobile SettingsPage.js — Login Methods section (pending product storyboards)

**Blocked on:** Penina's storyboards covering link/unlink permutations and final copy. Once unblocked:

**File:** `SettingsPage.js`

Add a "Login Methods" section. On mount call `Sefaria.api.getAuthStatus()`; render rows for Google (always) and Apple (iOS only). For each row:
- Linked: show "Connected" badge + "Disconnect" button. On disconnect, call `unlinkProvider()`; if it returns the `LastLoginMethodError` 409 message, surface it inline with a hyperlink/note directing the user to the web settings page to set a password.
- Not linked: show "Connect Google" / "Connect Apple" button. On press, call `linkProvider()`; if it returns an `AlreadyLinkedError` 409, surface it inline.
- Refresh state after every successful action.

---

## Critical Files

### Shipped (Phases 1–4)

| File | Location | Change |
|---|---|---|
| `sso/providers/apple.py` | Backend | Accept iOS bundle ID as valid audience |
| `sefaria/local_settings.py` | Backend | Add `APPLE_SSO_IOS_BUNDLE_ID` |
| `sefaria/local_settings_example.py` | Backend | Document new setting |
| `sefaria/views.py` | Backend | Return `access` + `refresh` from both SSO callbacks |
| `package.json` | Mobile | Add two native OAuth libraries |
| `api.js` | Mobile | `googleSSO()`, `appleSSO()`, `storeAuthToken()` |
| `AuthPage.js` | Mobile | SSO buttons, `isSSOLoading` state, SSO handlers |
| `ios/Sefaria/Info.plist` | Mobile/iOS | Reversed client ID URL scheme |
| `android/app/google-services.json` | Mobile/Android | Web client entry (verify present) |

### Phase 5 (pending)

| File | Location | Change |
|---|---|---|
| `sefaria/views.py` | Backend | Add `user_auth_status` view |
| `sefaria/urls_shared.py` | Backend | Register `api/auth/status` route |
| `api.js` | Mobile | Add `getAuthStatus()`, `linkProvider()`, `unlinkProvider()` |
| `SettingsPage.js` | Mobile | Add "Login Methods" section (blocked on product storyboards) |
