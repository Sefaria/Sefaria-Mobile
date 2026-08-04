# SSO Visual QA Fixes — Design

Date: 2026-08-04
Source: visual QA pass on the SSO sign-in screens

## Scope

Four QA notes on the Google/Apple sign-in screens. Two are code changes, one is
verification only, one is a configuration gap handed off rather than fixed.

This is a targeted QA pass, not a redesign of the auth screens. Nothing outside
the four notes changes.

| # | Note | Outcome |
|---|---|---|
| A | More breathing room between the page title and the first SSO button | Code change |
| B | Localized copy for the two new SSO error scenarios | Code change |
| C | Remove the Android loading spinner | Already done at HEAD — verify only |
| D | Google sign-in crashes on iOS | Config gap — written up, not fixed here |

## A. Title → button spacing

`styles.ssoSection` (`Styles.js`) has no top margin, so the SSO buttons sit
directly beneath the `pageTitle` text with no deliberate gap.

Add a `titleGap: 24` entry to `SSOSpacing` in `SSODesignTokens.js` and apply it
as `marginTop: SSOSpacing.titleGap` on `styles.ssoSection`.

The value goes in the token file rather than inline because `SSODesignTokens.js`
states that every SSO spacing value should reference a named constant rather
than a literal in `Styles.js`.

Both Log in and Sign up share `AuthPage`, so one change covers both screens.

## B. Error messages

### Background: what each endpoint actually returns

The provider-collision error is raised by `SefariaNewUserForm.clean_email` in
the backend (`sefaria/forms.py`), which is reached by the **register** endpoint
(`api/register/` → `register_api` → `process_register_form`). The form error
arrives on mobile as `errors.email` containing the backend's English sentence.

The **login** endpoint (`api/login/`) is a stock SimpleJWT `TokenObtainPairView`.
It returns a generic credential failure with no provider information at all.
Mobile cannot distinguish a Google-registered email from a wrong password on the
login path, and no mobile-side change can create that information.

Decision: wire the register path, which works end to end today. On login, the
existing generic message stands. The backend change needed for login is recorded
under "Follow-ups" below.

### Copy

Update `LocalizedStrings.js` to the QA-approved wording:

| key | English | Hebrew |
|---|---|---|
| `ssoEmailExistsGoogle` | This email address is registered via Google Sign-In. | דוא״ל זה רשום דרך גוגל. |
| `ssoEmailExistsApple` | This email address is registered via Apple Sign-In. | דוא״ל זה רשום דרך אפל. |

This drops "already" from the current mobile English. That is intentional and
creates no conflict: mobile matches on the backend's sentence but always
displays its own localized string, never the raw backend text.

Delete `ssoError` and `ssoAccountExists` (en and he). Both are dead — no
reference anywhere in the app.

Keep two strings QA's table does not cover, because something must render for
scenarios outside the two new SSO cases:

- `ssoErrorGeneric` — fallback for network failures, invalid tokens, and any
  unmapped backend code.
- `ssoEmailExistsGeneric` — maps to the backend's third `clean_email` branch, a
  pre-existing password account with that email. Not a new SSO scenario, but
  reachable on register today.

### Mapping

`ssoErrorMessage` in `AuthPage.js` currently decides via a substring heuristic
(`includes('email') && includes('exist')`), which would also fire on unrelated
messages containing both words.

Replace it with an exact match on the backend's three sentences — the same three
that web's `RegisterView.jsx` maps:

```
"This email address is already registered via Google Sign-In." → strings.ssoEmailExistsGoogle
"This email address is already registered via Apple Sign-In."  → strings.ssoEmailExistsApple
"An account with this email address already exists."           → strings.ssoEmailExistsGeneric
```

Anything unmatched falls through to `strings.ssoErrorGeneric`.

Exact matching couples mobile to the backend's English wording. Web already
accepts that same coupling, and it is more predictable than the heuristic it
replaces. If the backend later emits a machine-readable code, the map becomes a
code lookup with no other change.

### Display

The message renders in the existing `SSOErrorBanner`, which already sits between
the "or" divider and the first form field in `AuthPage`. One error surface
serves both SSO failures and email-collision errors, matching how web's single
`ErrorBanner` behaves. No new component, no layout change.

On register submit: if `errors.email` matches the map, set the banner state to
the localized string and suppress the bare inline `<Text>` for that field, so
the message does not appear twice on one screen. Every other field error keeps
its current inline behavior unchanged.

## C. Android loading spinner

No code change.

The spinner was already removed at branch HEAD — `SSOButtons.js` renders no
`ActivityIndicator` on either platform, and both fade to `opacity: 0.2` via
`styles.ssoButtonPressed`. QA observed a build predating that commit.

Verification: install a fresh Android build and confirm the pressed/in-flight
state on both SSO buttons is a fade with no spinner, matching iOS.

Note that `SystemButton` — the email/password Log in and Sign up submit button —
does still show a spinner while submitting. That is pre-existing behavior on
both platforms and is outside this scope.

## D. Google sign-in crash on iOS

Not fixed here. The cause is a configuration gap, not app code.

`ios/ReaderApp/Info.plist` carries a `CFBundleURLSchemes` value that is a
placeholder copied from the web OAuth client, with an inline comment saying so.
The iOS Google Sign-In SDK requires this to be the reversed form of an
iOS-type OAuth client ID and fails hard when it does not match.

Recorded under "Follow-ups".

## Testing

- Register with an email already linked to a Google account → banner shows the
  Google message in the interface language; no duplicate inline copy.
- Same for an Apple-linked email.
- Register with an email on an existing password account → generic
  already-exists message.
- Register with an unrelated field error (e.g. short password) → inline error
  behaves exactly as before, banner stays hidden.
- Both screens in Hebrew → banner text right-aligned, Hebrew copy.
- Visual: 24px between title and first button on Log in and Sign up.
- Android: SSO buttons fade with no spinner.

## Follow-ups (not this change)

1. **Backend — login-side provider collision.** `api/login/` must surface which
   provider an email is linked to so login can show the same two messages.
   Belongs to the server team; mobile's map is ready to consume it.
2. **iOS Google OAuth client.** Create an iOS-type OAuth client for
   `org.sefaria.sefariaApp` in Google Cloud, then replace the placeholder scheme
   in `Info.plist` and set `GOOGLE_SSO_IOS_CLIENT_ID`. Blocks Google sign-in
   testing on iOS.
