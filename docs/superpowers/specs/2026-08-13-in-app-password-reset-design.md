# In-app password reset (request step)

Date: 2026-08-13
Story: sc-46557
Status: approved, implementing

## Problem

Tapping "Forgot your password?" in the app opens `sefaria.org/password/reset` in mobile
web. For an SSO user that page gives no indication their account has no password, and if
they do complete a provider sign-in from there they end up authenticated **on mobile web,
not in the app**.

## Decision

Build the request-a-reset step as a screen in the app. Agreed in Slack 2026-08-12/13
(Akiva: "I vote we build the reset password in app"; Mickey: "will lead to a simpler
system"; Penina to mock).

### Scope: the request step only

The emailed link (`password/reset/confirm/<uidb64>/<token>/`) keeps opening mobile web.

This is not only an effort decision. Routing that link into the app would require claiming
`/password/reset*` as a universal link, and that path family is on the AASA **exclusion**
list added by Sefaria-Project#3609 to stop the app capturing auth URLs mid-flow. Building
the confirm step in-app would partially reverse the fix for the 2026-08-12 login outage, on
the exact paths that caused it.

## Backend

None required. `POST api/auth/password/reset` (`sso/views.py::password_reset_api`) already
returns everything the screen needs:

| Case | Response |
|---|---|
| Sent | `200 {}` |
| Malformed email | `400 {"error": "auth.invalid_email"}` |
| SSO-only account | `401 {"error": ..., "_auth": {"code": "sso_only_account", "providers": [...]}}` |

`providers` is the account's full linked-provider list, so google / apple / both are all
distinguishable. Mobile already maps that shape (`ssoOnlyAccountMessage` in `AuthPage.js`).

## Architecture

A third mode on `AuthPage`, alongside `login` and `register`:
`AUTH_MODE.FORGOT_PASSWORD`.

Chosen over a separate component because the SSO-only case must offer a *working* provider
button, and the provider-success path (`handleSSOTokenReceived`) is not a thin wrapper — it
derives the analytics outcome, dispatches login state and user email, calls `syncProfile`,
closes the page and fires the toast. A separate component would have to duplicate that, and
duplicated auth handling is exactly the drift the backend work eliminated by consolidating
on `sso_only_account_info`.

**Targeted extraction:** lift the SSO success handling out of `AuthPage` into a `useSSOSignIn`
hook used by both the existing buttons and the new mode. One definition of "a provider
sign-in succeeded", and `AuthPage` does not grow by the size of a duplicated handler. The
analytics bookkeeping (flow/attempt IDs, `flowOutcomeRef`) is not touched.

## States

One form, four render states:

1. **Form** — email input + submit. Reuses `AuthTextInput` and `SystemButton`.
2. **Sent** — confirmation that an email is on its way, plus a route back to login.
3. **SSO-only** — the provider message from `ssoOnlyAccountMessage`, plus a live
   `SSOButtons` control for the linked provider(s). Signing in from here logs the user into
   the app and dismisses the auth page, exactly as the login screen does.
4. **Error** — network or generic failure, using the existing strings.

## Strings

All from the UI strings sheet, already in `LocalizedStrings.js` (EN + HE). No new copy:

- `ssoEmailExistsGoogle` / `ssoEmailExistsApple` / `ssoEmailExistsAppleAndGoogle`
- `authErrorNetwork` (`authentication.error.network`)
- `ssoErrorGeneric` (`authentication.error.generic`)

The "sent" confirmation and the screen title need copy from Penina's mock. Until then they
use the nearest existing strings and are marked in code as provisional.

## Known debt: unknown-email response

For an email with no account, the screen matches web and still reports that a reset email
was sent.

Penina flagged this as confusing. The usual justification — not revealing who has an
account — does not really hold here, because `password_reset_api` already discloses account
existence and linked providers via `sso_only_account`. Deliberately deferred: changing it
needs a product decision and a new string.

## Entry point

`AuthPage.js`'s "Forgot your password?" currently calls
`openUri('https://www.sefaria.org/password/reset')`. It switches to entering the new mode.

This also unblocks removing the obsolete standalone web route (sc-46563), which could not
be deleted while the app linked directly at it.

## Testing

- Provider mapping: google / apple / both / empty / missing `_auth`.
- Each render state reached from its corresponding response.
- A provider sign-in from the SSO-only state produces the same logged-in result as one from
  the login screen (guards the `useSSOSignIn` extraction).
- Regression: login and register modes are unchanged.

## Out of scope

- The set-new-password step (see Scope above).
- Any AASA change.
- Reworking web's reset flow.
