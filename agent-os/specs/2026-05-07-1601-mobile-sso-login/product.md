# Mobile SSO Login — Product Spec

**Status:** In progress  
**Owner:** Akiva Berger  
**Last Updated:** 2026-05-07

---

## Problem

The Sefaria mobile app supports email/password login only. The web app already has working Google and Apple SSO via `/api/auth/google/callback` and `/api/auth/apple/callback`, but those endpoints return Django session cookies — useless for a native mobile client that uses JWT tokens. The mobile app also has no OAuth libraries installed and no SSO UI. Users who created a Sefaria account via Google or Apple SSO on the web cannot log in to the mobile app at all.

---

## Goals

1. Allow mobile users to sign up and log in with Google (iOS and Android).
2. Allow mobile users to sign up and log in with Apple (iOS only — App Store requirement).
3. Reuse the existing backend SSO infrastructure (`SocialAuthService`, `SocialIdentity`, both callback endpoints) with minimal backend changes.
4. Preserve existing email/password login without regression.
5. SSO login on mobile issues and stores JWT tokens with the same lifecycle as email/password tokens (access + refresh, stored in AsyncStorage).

---

## Non-Goals

- Account linking UI in mobile settings (can be done on web; out of scope for this spec)
- Android support for Apple Sign In (Apple does not provide a native Android SDK)
- Other SSO providers (Facebook, GitHub, etc.)
- Biometric authentication

---

## User Flows

### Flow 1: New user registers via Google on mobile

1. User opens the login/register screen.
2. Taps **Continue with Google**.
3. Native Google Sign-In sheet appears; user selects their account.
4. Mobile app receives a Google `idToken` from the native SDK.
5. App POSTs `{ credential: idToken }` to `/api/auth/google/callback`.
6. Backend verifies JWT, creates `User` + `SocialIdentity` + `UserProfile`, returns `{ status: "ok", is_new_user: true, access, refresh }`.
7. App stores `access` + `refresh` tokens in AsyncStorage; dispatches `setIsLoggedIn = true`.
8. Auth screen closes; sync runs.

### Flow 2: Returning SSO user logs in on mobile

Same as Flow 1, steps 1–5. Backend finds existing `SocialIdentity` by `(provider, sub)`, returns tokens. App stores them and opens.

### Flow 3: New user registers via Apple on iOS

1. User taps **Continue with Apple**.
2. Native Apple Sign-In sheet appears; user authenticates with Face ID / Touch ID.
3. App receives `identityToken` (JWT) and `fullName` from `@invertase/react-native-apple-authentication`.
4. App POSTs `{ id_token, first_name, last_name }` to `/api/auth/apple/callback`.
5. Backend verifies JWT against Apple's JWKS endpoint, accepts iOS bundle ID as valid audience, creates account, returns `{ status: "ok", is_new_user: true, access, refresh }`.
6. App stores tokens, sets `isLoggedIn = true`.

### Flow 4: Email collision on mobile

1. User taps a social sign-in button.
2. Backend detects email collision (SSO email matches an existing password account).
3. Backend returns `{ error: "...", status: 409 }`.
4. App displays the error message inline on the auth screen (same as any other auth error).

---

## Data Flow

```
Mobile App                          Backend
──────────                          ───────
Google SDK → idToken  ──POST──►  /api/auth/google/callback
Apple SDK  → idToken  ──POST──►  /api/auth/apple/callback
                                   │
                                   ├─ verify JWT (provider SDK)
                                   ├─ SocialAuthService.get_or_create_social_user()
                                   ├─ auth_login() [session for web]
                                   └─ RefreshToken.for_user(user) ─► { access, refresh }
                                                                           │
◄──────────────────────────────────────────────────────────────────────────┘
App decodes access token → stores uid, expiry, tokens in AsyncStorage
```

---

## Success Criteria

- [ ] iOS user can sign up and log in with Google
- [ ] Android user can sign up and log in with Google
- [ ] iOS user can sign up and log in with Apple
- [ ] Apple Sign In button does not appear on Android
- [ ] SSO tokens persist across app restarts (AsyncStorage)
- [ ] SSO tokens refresh on expiry via existing `/api/login/refresh/` flow
- [ ] Email collision shows a clear error message
- [ ] Existing email/password login is unaffected
- [ ] Backend Apple verification accepts the iOS bundle ID (`org.sefaria.sefaria`) as a valid audience

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Email collision | 409 from backend; inline error on auth screen |
| Apple re-auth — name not returned | Apple only returns name on first auth; backend service already handles this |
| Google token expired before POST | Native SDK returns a fresh token; app retries if needed |
| User cancels native sign-in sheet | Native SDK throws a cancellation error; app catches and does nothing (no error shown) |
| SSO user tries to log in via email/password | Existing email/password form still works; SSO buttons are additive |
| Refresh token expires for SSO user | Same flow as email/password — `clearAuthStorage()` is called, user re-authenticates |
