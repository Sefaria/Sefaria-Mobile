# Mobile SSO Login — Product Spec

**Status:** In progress  
**Owner:** Akiva Berger  
**Last Updated:** 2026-05-13

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

- Password creation for SSO-only users on mobile (web settings page handles this; mobile shows an inline message directing the user to web if they try to disconnect their only login method without a password)
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

### Flow 4: SSO email matches an existing password account (auto-link)

1. User taps a social sign-in button (mobile) or completes Google One Tap (web).
2. Backend cannot find a `SocialIdentity` for `(provider, sub)`, but `user_exists(email)` returns True.
3. Backend creates a `SocialIdentity` attaching the SSO identity to the existing user and logs them in. No collision error; the experience is seamless. The provider has already asserted the email is verified, so the SSO user demonstrably controls the mailbox.
4. App receives `{ status: "ok", is_new_user: false, access, refresh }` and proceeds as a normal login.

### Flow 5: Link a social provider from mobile Settings

1. User logs in with email/password (or with one social provider).
2. User opens Settings → Login Methods.
3. App calls `GET /api/auth/status` and renders rows for each provider: "Connected" badge if already linked, "Connect" button if not.
4. User taps "Connect Google" (or "Connect Apple" on iOS).
5. Native sign-in sheet appears; the user authenticates with that provider.
6. App POSTs the resulting `idToken` to `/api/auth/link/<provider>` with the user's Bearer JWT.
7. Backend verifies the token, attaches the `SocialIdentity` to the current `User`, returns `{ status: "ok" }`.
8. App refreshes auth status; the row now shows "Connected".

### Flow 6: Unlink a social provider from mobile Settings

1. User taps "Disconnect" on a connected provider row.
2. App calls `DELETE /api/auth/unlink/<provider>` with the Bearer JWT.
3. If the user has no other login method (no password and no other social provider), backend returns 409 with the message "You must set a password before disconnecting a login method." App surfaces the message with a note pointing the user to the web settings page to set a password (mobile does not support password creation in this iteration).
4. Otherwise backend returns `{ status: "ok" }` and the row flips to "Connect".

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

- [x] iOS user can sign up and log in with Google
- [x] Android user can sign up and log in with Google
- [x] iOS user can sign up and log in with Apple
- [x] Apple Sign In button does not appear on Android
- [x] SSO tokens persist across app restarts (AsyncStorage)
- [x] SSO tokens refresh on expiry via existing `/api/login/refresh/` flow
- [x] Email collision shows a clear error message directing the user to log in with their password and link in Settings
- [x] Existing email/password login is unaffected
- [x] Backend Apple verification accepts the iOS bundle ID (`org.sefaria.sefaria`) as a valid audience

### Phase 2 (Account Linking) — pending implementation

- [ ] Mobile Settings exposes a "Login Methods" section listing the connected providers
- [ ] User can link Google from Settings (iOS and Android)
- [ ] User can link Apple from Settings (iOS only)
- [ ] User can disconnect a provider if they have at least one other login method
- [ ] Attempting to disconnect the last login method (no password set) returns a clear error pointing the user to the web settings page

---

## Edge Cases

| Scenario | Handling |
|---|---|
| SSO email matches existing password account | Backend auto-links the new `SocialIdentity` to the existing user and logs them in (Flow 4). The user's password remains valid; either method can be used afterward. |
| Apple re-auth — name not returned | Apple only returns name on first auth; backend service already handles this |
| Google token expired before POST | Native SDK returns a fresh token; app retries if needed |
| User cancels native sign-in sheet | Native SDK throws a cancellation error; app catches and does nothing (no error shown) |
| SSO user tries to log in via email/password | Existing email/password form still works; SSO buttons are additive |
| Refresh token expires for SSO user | Same flow as email/password — `clearAuthStorage()` is called, user re-authenticates |
| User unlinks their only login method (no password set) | Backend returns 409 with `LastLoginMethodError` message; mobile surfaces it and directs the user to the web settings page to set a password first |
| User tries to link a provider that's already linked to another Sefaria account | Backend returns 409 `AlreadyLinkedError`; mobile shows the error inline on the Login Methods row |
| Apple proxy email goes stale (user revoked the relay) | Accepted as out-of-scope to handle proactively. The `SocialIdentity` row remains valid (matched on provider+sub, not email); only outbound email to that address fails. Per the 2026-05-11 product meeting, this is a Salesforce/communications concern, not an auth concern. Users in this state contact `hello@sefaria.org` for resolution. |

---

## Decisions from 2026-05-11 product meeting

The "Next steps on SSO" meeting (Michael Fankhauser, Penina Levy, Tzirel Shaffren, Akiva Berger) settled the following questions:

1. ~~**Explicit linking only — no auto-linking on collision.**~~ **Reversed 2026-05-13.** The original meeting decision required users to log in with their password and then explicitly link the provider from Settings. In practice the UX was poor — One Tap users saw the prompt vanish with no obvious next step. The reversed policy auto-links the new `SocialIdentity` to the existing user when the SSO email matches a password account. Security rationale for the reversal: the provider (Google/Apple) signs `email_verified: true` into the ID token, so the SSO user demonstrably controls the mailbox and could in any case recover the password account via "forgot password." Manual linking from Settings remains available for cases where the user wants to attach a *different* email's social identity to their account.
2. **Settings page is the source of truth for linking and unlinking.** Mobile must expose the same linking surface as web (link Google, link Apple, disconnect each). The backend endpoints already exist at `/api/auth/link/<provider>` (POST) and `/api/auth/unlink/<provider>` (DELETE).
3. **Password reset for SSO users uses the existing forgot-password flow.** Reset emails are sent to whatever email the `User` has on file (including the Apple proxy address). Password creation for SSO-only users on mobile is out of scope for this iteration — defer to the web settings page.
4. **Apple proxy email staleness is tolerated.** Salesforce will accumulate dead proxy addresses; this is acceptable. Identity is anchored on `(provider, sub)`, not email.
5. **Cancellation is silent.** Native SDK cancellation errors are swallowed; no toast or inline error.
6. **MVP boundary.** The login/register SSO buttons (already shipped on mobile) are the MVP. The Login Methods section in Settings is the next phase. Storyboards covering all permutations (pre-existing email account → SSO register, pre-existing SSO → password login, etc.) are owned by Penina and will inform any UI copy changes before the Settings work ships.
