# Mobile SSO Login — Shaping Notes

## Scope

Two backend fixes (minimal) + mobile library + api.js + AuthPage.js + platform config. The web SSO flows and the `SocialAuthService` are untouched. No new backend endpoints.

---

## Architecture

### Backend: two targeted fixes only

**Fix 1 — Return JWT tokens from SSO callbacks.**  
Both `google_sso_callback` and `apple_sso_callback` currently call `auth_login()` and return `{ status: "ok" }`. The web reads the resulting session cookie; the mobile app reads nothing useful. After `auth_login()`, mint a JWT pair with `rest_framework_simplejwt.tokens.RefreshToken.for_user(user)` and include `access` and `refresh` in the response body. The web ignores these fields; the mobile app reads them. Zero regression to the web.

**Fix 2 — Apple audience check must accept the iOS bundle ID.**  
`sso/providers/apple.py` hard-checks `claims["aud"] == settings.APPLE_SSO_CLIENT_ID` (`org.sefaria.web.signin`). Native iOS Apple Sign In tokens have `aud = org.sefaria.sefaria` (the bundle ID), not the web service ID. The check must accept either. Add `APPLE_SSO_IOS_BUNDLE_ID = "org.sefaria.sefaria"` to settings and update the audience assertion to `claims["aud"] in valid_audiences`.

### Mobile: native SDK + thin api.js layer + AuthPage UI

**Native libraries:**
- `@react-native-google-signin/google-signin` — both iOS and Android; configured with `webClientId = GOOGLE_SSO_CLIENT_ID` so the returned `idToken` has the web client ID as its audience, matching what the backend's `verify_token()` expects.
- `@invertase/react-native-apple-authentication` — iOS only; ships `AppleButton` component with Apple-required styling.

**No custom OAuth flows.** Both libraries handle token exchange natively; the mobile app never touches OAuth redirect URLs or authorization codes. It just receives a signed JWT and forwards it to the Sefaria backend.

**api.js — extract `_storeAuthTokens()`, add `googleSSO()` and `appleSSO()`.**  
The existing `authenticate()` method decodes the JWT and writes to `Sefaria._auth` + AsyncStorage. Extract this repeated pattern into a private `_storeAuthTokens(access, refresh)` helper. `googleSSO()` and `appleSSO()` call the backend, then call `_storeAuthTokens()` on success. Both return the same shape as `authenticate()`: an errors object (empty on success) so `AuthPage.js` can stay unchanged in its error-display logic.

**AuthPage.js — SSO buttons below the form.**  
Add an "or" divider and two SSO buttons below the existing `SystemButton` (submit). Apple button uses `AppleButton` from the library (required by Apple HIG). Google button uses a custom `SystemButton`-styled button. Both buttons are shown on login AND register screens — SSO covers both flows. Apple button is gated on `Platform.OS === 'ios'`.

---

## Decisions

- **`webClientId` on Google Sign-In.** Without `webClientId`, the native SDK returns an `idToken` with the mobile OAuth client ID as audience. The backend's `verify_token()` validates against `GOOGLE_SSO_CLIENT_ID` (the web client ID). Setting `webClientId` causes Google to return an `idToken` whose `aud` is the web client ID — matching the backend check exactly. The web and mobile OAuth client IDs can differ; only the web client ID matters for backend verification.
- **No server auth code flow.** We use the `idToken` directly (not `serverAuthCode`). This is simpler and sufficient — the backend only needs to verify the JWT, not make server-to-server calls.
- **Apple Sign In iOS-only.** `@invertase/react-native-apple-authentication` throws on Android. Gate the import and the button with `Platform.OS === 'ios'` — do not render on Android at all.
- **App Store guideline 4.8 compliance.** If any third-party sign-in is offered on iOS, Apple Sign In must also be offered. Since we offer Google, we must offer Apple on iOS.
- **Cancellation is silent.** Both native SDKs throw a cancellation error when the user dismisses the sheet. Catch it and do nothing — do not show an error to the user.
- **`onLoginSuccess` callback reused.** The existing `onLoginSuccess` in `AuthPage.js` dispatches state, calls `syncProfile()`, closes the sheet, and shows a toast. SSO flows call the same callback — no duplication.

---

## Known Gaps Addressed

| Gap | Fix |
|---|---|
| SSO callbacks return session only, not JWT | Add `RefreshToken.for_user(user)` to both callback views |
| Apple audience check rejects iOS bundle ID | Accept `APPLE_SSO_IOS_BUNDLE_ID` alongside web service ID |
| No OAuth libraries in mobile | Install two native packages |
| No SSO UI in `AuthPage.js` | Add SSO buttons below the form |
| Google `webClientId` must match backend client ID | Configure `GoogleSignin.configure({ webClientId })` with the web client ID |

---

## Out of Scope

- Account linking UI in mobile settings (web settings page handles this)
- `react-native-google-signin` `serverAuthCode` flow
- Custom-styled Apple button (must use `AppleButton` from the library)
- Changes to `SocialAuthService`, `SocialIdentity`, or any other backend logic
