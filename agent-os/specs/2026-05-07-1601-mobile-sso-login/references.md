# References for Mobile SSO Login

## Internal — Backend

- `sso/providers/apple.py` — Apple JWT verification; audience check to fix
- `sso/providers/google.py` — Google JWT verification via `google.oauth2.id_token`
- `sso/service.py` — `SocialAuthService`; unchanged by this spec
- `sso/models.py` — `SocialIdentity` model; unchanged
- `sefaria/views.py` lines 220–286 — `google_sso_callback` and `apple_sso_callback`; add JWT return
- `sefaria/local_settings.py` — `APPLE_SSO_CLIENT_ID`, `GOOGLE_SSO_CLIENT_ID`; add `APPLE_SSO_IOS_BUNDLE_ID`
- `sefaria/local_settings_example.py` — document new setting
- `sefaria/urls_shared.py` — existing URL registrations for SSO callbacks; no changes
- `rest_framework_simplejwt.tokens.RefreshToken` — already in `requirements.txt` via `djangorestframework-simplejwt`

## Internal — Mobile

- `api.js` — `authenticate()` method (token decode + AsyncStorage pattern to extract)
- `api.js` — `getAuthToken()` / `refreshToken()` (shows existing token lifecycle)
- `api.js` — `clearAuthStorage()` (called on refresh failure)
- `AuthPage.js` — existing `onSubmit` / `onLoginSuccess` flow to mirror for SSO
- `AuthPage.js` — `useAuthForm` hook; SSO state fits alongside it
- `StateManager.js` — `STATE_ACTIONS.setIsLoggedIn`, `STATE_ACTIONS.setUserEmail`
- `Styles.js` — `systemButton`, `boxShadow`, `textInput` style tokens to reuse
- `Misc.js` — `SystemButton` component (reference for consistent button styling)

## External — Libraries

- `@react-native-google-signin/google-signin` — https://github.com/react-native-google-signin/google-signin
  - Configure: `GoogleSignin.configure({ webClientId })`
  - Sign in: `GoogleSignin.signIn()` → `{ data: { idToken } }`
  - Cancellation: `statusCodes.SIGN_IN_CANCELLED`
- `@invertase/react-native-apple-authentication` — https://github.com/invertase/react-native-apple-authentication
  - Sign in: `appleAuth.performRequest({ requestedOperation, requestedScopes })`
  - Returns: `{ identityToken, fullName: { givenName, familyName } }`
  - Button: `AppleButton` with `Type.SIGN_IN`, `Style.BLACK`
  - Cancellation: `appleAuth.Error.CANCELED`

## External — Docs

- Google Identity for Mobile: https://developers.google.com/identity/sign-in/android/start-integrating
- Apple Sign In for iOS: https://developer.apple.com/documentation/authenticationservices/implementing_user_authentication_with_sign_in_with_apple
- App Store guideline 4.8 (Sign In with Apple requirement): https://developer.apple.com/app-store/review/guidelines/#sign-in-with-apple
- Apple Human Interface Guidelines — Sign In with Apple button: https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple
