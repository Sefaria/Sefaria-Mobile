# Mobile SSO: Google + Apple Sign-In

**Stories:** sc-45083, sc-44778
**Epic:** Register & Sign In via Google & Apple (SSO) (epic 22621)
**Backend PR:** Sefaria-Project #3511 (cauldron: soo.cauldron.sefaria.org)
**Figma:** https://www.figma.com/design/2WflG98PDhWQ7OKrDkaCPb/Registration---Login-Wireframes?node-id=591-4494

---

## 1. Approach: Hybrid Native SDKs

- **Google Sign-In**: `@react-native-google-signin/google-signin` on both iOS and Android (native OS dialog)
- **Apple Sign-In iOS**: `@invertase/react-native-apple-authentication` (native ASAuthorization sheet)
- **Apple Sign-In Android**: Web-based redirect (Apple does not offer a native Android SDK; Figma notes confirm this approach — "we will bring the user to a mobile web redirect")

## 2. Design Tokens (from Figma node 239:16766)

All tokens extracted from the Figma file. Values in parentheses are the Figma design-system variable names.

### Colors

| Token | Value | Figma Variable | Usage |
|-------|-------|---------------|-------|
| `sefariaBlue` | `#18345D` | `--semantic/action/primary` | SSO button border, action button bg, existing app primary |
| `white` | `#FFFFFF` | `--sds-color-background-default-default` | SSO button background, page background |
| `buttonTextDark` | `#18345D` | (same as primary) | SSO button text color |
| `buttonTextWhite` | `#FFFFFF` | — | Action button text (Sign Up / Log In) |
| `dividerGray` | `#CCCCCC` | — | "or" divider line |
| `dividerText` | `#999999` | — | "or" text |
| `placeholderLight` | `#777777` | — | Input placeholder (light theme) |
| `placeholderDark` | `#BBBBBB` | — | Input placeholder (dark theme) |

### Spacing

| Token | Value | Figma Variable | Usage |
|-------|-------|---------------|-------|
| `ssoButtonGap` | `16px` | `--global/dimension-200` | Gap between Google and Apple buttons |
| `ssoSectionGap` | `24px` | — | Gap between SSO buttons section and divider |
| `ssoButtonPaddingH` | `24px` | `--sds-size-space-600` | Horizontal padding inside SSO button |
| `ssoButtonPaddingV` | `16px` | `--sds-size-space-400` | Vertical padding inside SSO button |
| `ssoButtonIconGap` | `8px` | `--sds-size-space-200` | Gap between icon and text in SSO button |
| `ssoContainerWidth` | `337px` | — | SSO buttons container width (matches form width) |
| `formMarginH` | `37px` | — | Existing form horizontal margin (from AuthPage.js:115) |
| `sectionGap` | `16px` | — | Gap between major sections |

### Dimensions

| Token | Value | Figma Variable | Usage |
|-------|-------|---------------|-------|
| `ssoButtonHeight` | `51px` | — | SSO button height |
| `ssoButtonBorderWidth` | `1.5px` | `--sds-size-stroke-border` | SSO button border width |
| `ssoButtonRadius` | `4px` | `--space-1` | SSO button border radius |
| `ssoIconSize` | `24px` | — | Google/Apple icon size (inside 10px padding container) |
| `actionButtonRadius` | `5px` | — | Sign Up / Log In button radius (existing `styles.systemButton`) |

### Typography

| Token | Value | Usage |
|-------|-------|-------|
| `pageTitle` | `Amiri, 30px` | "Sign up" / "Log in" heading (existing) |
| `ssoButtonText` | `system font, ~16px` | "Continue with Google/Apple" |
| `dividerText` | `system font, 14px` | "or" / "או" |
| `inputText` | `system font, 20px` | Input field text (existing `styles.textInput`) |
| `linkText` | `OpenSans` | Footer links (existing `styles.systemButtonText`) |

## 3. Platform Button Visibility Matrix

| Screen | iOS | Android |
|--------|-----|---------|
| **Sign Up** | Google + Apple | Google only |
| **Log In** | Google + Apple | Google + Apple |

On Android Sign Up, the Apple button is explicitly hidden per Figma design notes.

## 4. Auth Flow

```
User taps SSO button
  ├─ Google (both platforms):
  │   └─ @react-native-google-signin → native OS dialog
  │       └─ returns { idToken, user: { email, givenName, familyName } }
  │
  ├─ Apple (iOS):
  │   └─ @invertase/react-native-apple-authentication → ASAuthorization sheet
  │       └─ returns { identityToken, fullName, email }
  │
  └─ Apple (Android):
      └─ Web redirect via expo-auth-session or custom WebView
          └─ returns { id_token } from Apple's /auth/token endpoint

→ POST id_token to backend:
  ├─ Google: POST /api/auth/google/redirect { credential: idToken }
  └─ Apple:  POST /api/auth/apple/callback  { id_token, first_name, last_name }

→ Backend (django-allauth):
  ├─ Verifies token with provider
  ├─ Creates/links user account
  └─ Returns response (session or JWT)

→ Mobile app:
  ├─ If JWT returned: store via Sefaria.api.storeAuthToken()
  ├─ If session returned: call /api/login/ to get JWT
  ├─ Dispatch STATE_ACTIONS.setIsLoggedIn + setUserEmail
  ├─ syncProfile()
  └─ close + showToast
```

## 5. Component Architecture

### Modified files

| File | Changes |
|------|---------|
| `AuthPage.js` | Add SSO buttons section above email form, new `SSOButtons` component, new `OrDivider` component |
| `api.js` | Add `socialLogin(provider, idToken, userData)` method |
| `sefaria.js` | Add SSO config (Google client IDs, Apple service ID) |
| `Styles.js` | Add SSO button styles |
| `LocalizedStrings.js` | Add SSO strings (en + he) |
| `package.json` | Add `@react-native-google-signin/google-signin`, `@invertase/react-native-apple-authentication` |

### New files

| File | Purpose |
|------|---------|
| `SSOButtons.js` | `SSOButtons` component with Google/Apple provider buttons |

### Component tree (AuthPage after changes)

```
AuthPage
├─ KeyboardAvoidingView (iOS) / View (Android)
│  └─ ScrollView
│     ├─ RainbowBar
│     ├─ CircleCloseButton
│     ├─ Text (page title: "Sign up" / "Log in")
│     ├─ SSOButtons  ← NEW
│     │  ├─ ProviderButton (Google)  ← always shown
│     │  └─ ProviderButton (Apple)   ← hidden on Android + register
│     ├─ OrDivider  ← NEW ("or" / "או")
│     ├─ AuthTextInput (First Name)  [register only]
│     ├─ AuthTextInput (Last Name)   [register only]
│     ├─ AuthTextInput (Email)
│     ├─ AuthTextInput (Password)
│     ├─ SystemButton (Sign Up / Log In)
│     └─ Links (switch mode, terms, forgot password)
```

### SSOButtons component

```
Props:
  - authMode: 'login' | 'register'
  - onSSOSuccess: (email) => void   // same callback as email login success
  - onSSOError: (error) => void

Internal state:
  - isLoading: boolean
  - loadingProvider: 'google' | 'apple' | null

Platform logic:
  - showApple = Platform.OS === 'ios' || authMode === 'login'
```

### New API method: `api.socialLogin`

```javascript
socialLogin: async function(provider, idToken, userData) {
  const endpoint = provider === 'google'
    ? 'api/auth/google/redirect'
    : 'api/auth/apple/callback';

  const body = provider === 'google'
    ? { credential: idToken }
    : { id_token: idToken, first_name: userData?.firstName, last_name: userData?.lastName };

  const response = await fetch(`${Sefaria.api._baseHost}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // If backend returns JWT directly, store it
  // If backend returns session, follow up with JWT request
  const data = await response.json();
  if (data.access && data.refresh) {
    await Sefaria.api.storeAuthToken(data);
  }
  return data;
}
```

## 6. New Localized Strings

### English
```
continueWithGoogle: "Continue with Google"
continueWithApple: "Continue with Apple"
or: "or"
ssoError: "Sign-in failed. Please try again."
ssoAccountExists: "An account with this email already exists. Try logging in with your password."
```

### Hebrew
```
continueWithGoogle: "להמשיך עם גוגל"
continueWithApple: "להמשיך עם אפל"
or: "או"
ssoError: "ההתחברות נכשלה. נסו שנית."
ssoAccountExists: "חשבון עם כתובת אימייל זו כבר קיים. נסו להתחבר עם הסיסמא שלכם."
```

## 7. New Styles

```javascript
// In Styles.js
ssoSection: {
  alignItems: 'center',
  marginBottom: 8,
},
ssoButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  height: 51,
  borderWidth: 1.5,
  borderColor: '#18345D',
  borderRadius: 4,
  backgroundColor: '#FFFFFF',
  paddingHorizontal: 24,
  paddingVertical: 16,
  gap: 8,
  marginVertical: 8,
},
ssoButtonText: {
  fontSize: 16,
  color: '#18345D',
  fontFamily: 'OpenSans',
},
ssoIcon: {
  width: 24,
  height: 24,
},
orDivider: {
  flexDirection: 'row',
  alignItems: 'center',
  marginVertical: 16,
},
orDividerLine: {
  flex: 1,
  height: 1,
  backgroundColor: '#CCCCCC',
},
orDividerText: {
  marginHorizontal: 16,
  fontSize: 14,
  color: '#999999',
},
```

## 8. Native Setup Required

### Google Sign-In
- **Google Cloud Console**: Create OAuth 2.0 client IDs (iOS + Android + Web)
- **iOS**: Add `GoogleService-Info.plist` URL scheme to Info.plist
- **Android**: Add SHA-1 fingerprint to Firebase project, `google-services.json` already present

### Apple Sign-In
- **Apple Developer Console**: Enable "Sign in with Apple" capability
- **iOS**: Add Sign in with Apple entitlement in Xcode
- **Android**: Register a Services ID + configure redirect URI for web-based Apple auth

### Pod/Gradle
- `cd ios && pod install` (adds GoogleSignIn + AppleAuthentication pods)
- Android: auto-linked via React Native CLI

## 9. Error Handling

| Scenario | Behavior |
|----------|----------|
| User cancels SSO dialog | No error shown, buttons return to idle |
| Network error during token exchange | Show `ssoError` banner above form |
| Email already exists (password account) | Show `ssoAccountExists` message + keep on login screen |
| Backend returns SSO-only account error on email login | Show message indicating to use Google/Apple sign-in |
| Apple hides email (relay) | Accept the relay email — backend handles it |
| Token verification fails | Show `ssoError` banner |

## 10. Figma Node Reference

For implementation, use these Figma node IDs with `get_design_context`:

| Component | Node ID | Description |
|-----------|---------|-------------|
| Full Apps section | `591:4494` | Overview of all screens |
| Android Sign Up EN | `239:16761` | Android sign-up with Google only |
| SSO + divider | `239:16766` | Google button + "or" divider (reusable) |
| Android section | `239:16083` | All 4 Android screens + design notes |
| Hebrew Sign Up (Android) | `239:17297` | Hebrew RTL variant |

## 11. Scope Exclusions

- No dark-theme SSO button variant (use same white bg in dark mode — matches Google/Apple branding guidelines)
- No "Sign in with Apple" on Android sign-up page (per Figma design)
- No backend changes (frontend only — backend available at soo.cauldron.sefaria.org)
- LogInMotivator icons (bookmark/sync/mail) are removed in the new design (replaced by SSO buttons)
- No reCAPTCHA for SSO flows (provider handles bot protection)
