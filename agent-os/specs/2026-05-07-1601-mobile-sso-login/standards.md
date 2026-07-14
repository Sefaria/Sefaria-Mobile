# Standards for Mobile SSO Login

## Backend

### API Responses
- All SSO callback views return `jsonResponse(data)` from `sefaria.client.util`
- Success shape: `{ "status": "ok", "is_new_user": bool, "access": str, "refresh": str }`
- Error shape: `{ "error": "message" }` with appropriate HTTP status
- Web consumers already ignore unknown fields — adding `access`/`refresh` is non-breaking

### JWT Minting
- Use `rest_framework_simplejwt.tokens.RefreshToken.for_user(user)` — same library used by `/api/login/`
- Do not create a new token serializer; use the library default
- Mint the token after `auth_login()` succeeds, never before

### Apple Audience Check
- `APPLE_SSO_CLIENT_ID` = web service ID (`org.sefaria.web.signin`)
- `APPLE_SSO_IOS_BUNDLE_ID` = iOS bundle ID (`org.sefaria.sefaria`)
- Check with `claims["aud"] in {settings.APPLE_SSO_CLIENT_ID, settings.APPLE_SSO_IOS_BUNDLE_ID}` — both must be accepted
- New setting documented in `local_settings_example.py` alongside existing Apple settings

---

## Mobile

### Library Imports
- Import `GoogleSignin` from `@react-native-google-signin/google-signin`
- Import `appleAuth`, `AppleButton` from `@invertase/react-native-apple-authentication`
- Apple imports must be inside a `Platform.OS === 'ios'` guard or in an iOS-only module — the library throws on Android at import time on some versions; guard all usage

### Google Sign-In Configuration
- `GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID })` called once at app startup (in `Sefaria.init()` or top of `api.js`)
- `GOOGLE_WEB_CLIENT_ID` is the same value as the backend's `GOOGLE_SSO_CLIENT_ID` — not the iOS or Android mobile client ID
- Always call `GoogleSignin.hasPlayServices()` before `GoogleSignin.signIn()` on Android

### Token Storage Pattern
- The `_storeAuthTokens(access, refresh)` helper is the single place that writes to `Sefaria._auth` and AsyncStorage key `'auth'`
- `authenticate()` must be refactored to call `_storeAuthTokens()` rather than inline the same logic
- Token shape: `{ token, expires, uid, refreshToken }` — matches existing `Sefaria._auth` structure

### Error Handling in api.js SSO methods
- User cancellation errors (both Google and Apple) must be caught and return `{}` (empty errors object) — callers treat empty errors as no-op
- Google cancellation: `statusCodes.SIGN_IN_CANCELLED` from `@react-native-google-signin/google-signin`
- Apple cancellation: `appleAuth.Error.CANCELED` from `@invertase/react-native-apple-authentication`
- All other errors: return `{ non_field_errors: "Sign-in failed. Please try again." }`

### AuthPage SSO Handlers
- SSO handlers use a shared `isSSOLoading` state (separate from the existing `isLoading` for email/password)
- On success: call the same `onLoginSuccess(email)` callback — dispatch state, sync, close, toast
- On error: call `setErrors(errors)` — the existing error display handles it
- Apple button: use `AppleButton` with `AppleButton.Type.SIGN_IN` and `AppleButton.Style.BLACK` (or `WHITE` for dark theme) — do not create a custom-styled button (App Store requirement)

### Platform Guards
- Apple Sign-In UI: `Platform.OS === 'ios'` guard in JSX
- Apple api.js methods: called only from the iOS-guarded UI path; the method itself does not need an additional platform check
- Google Sign-In: works on both platforms; no platform guard needed in the API layer

### Styles
- SSO buttons follow the same width/margin conventions as `SystemButton` in `Styles.js`
- "or" divider: horizontal line with centered text, matching secondary text color from theme
- Do not add new color or sizing constants — reuse existing style tokens
