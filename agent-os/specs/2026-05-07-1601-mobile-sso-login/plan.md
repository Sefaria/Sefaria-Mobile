# Mobile SSO Login — Implementation Plan

## Context

The Sefaria web app has working Google and Apple SSO (Phases 1–5 of the web SSO spec). This plan adds native Google and Apple Sign-In to the React Native mobile app. It requires two small backend fixes (JWT in SSO responses, Apple audience check) and mobile-side library + api.js + UI work.

---

## Phase 1: Backend Fixes

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

## Phase 2: Mobile Libraries

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

## Phase 3: Mobile api.js

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

## Phase 4: AuthPage.js UI

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

## Critical Files

| File | Location | Change |
|---|---|---|
| `sso/providers/apple.py` | Backend | Accept iOS bundle ID as valid audience |
| `sefaria/local_settings.py` | Backend | Add `APPLE_SSO_IOS_BUNDLE_ID` |
| `sefaria/local_settings_example.py` | Backend | Document new setting |
| `sefaria/views.py` | Backend | Return `access` + `refresh` from both SSO callbacks |
| `package.json` | Mobile | Add two native OAuth libraries |
| `api.js` | Mobile | `_storeAuthTokens()`, `googleSSO()`, `appleSSO()`, `doAuthenticate()` |
| `AuthPage.js` | Mobile | SSO buttons, `isSSOLoading` state, SSO handlers |
| `ios/Sefaria/Info.plist` | Mobile/iOS | Reversed client ID URL scheme |
| `android/app/google-services.json` | Mobile/Android | Web client entry (verify present) |
