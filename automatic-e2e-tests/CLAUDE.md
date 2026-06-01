# CLAUDE.md

Guidance for AI coding agents (and humans skimming for the essentials) working in the
`automatic-e2e-tests` directory. Keep this file accurate — when behavior or structure
changes, update this file in the same PR.

---

## What this project is

A **cross-platform end-to-end (E2E) UI testing framework** for the Sefaria Mobile app,
covering **both Android and iOS** from a single shared TypeScript codebase. Tests drive a
real/virtual device through [Appium](https://appium.io/) + [WebdriverIO](https://webdriver.io/),
orchestrated by [Mocha](https://mochajs.org/), and run either **locally** (your own
device/emulator via a local Appium server) or in the **cloud** (BrowserStack, including via
GitHub Actions).

This directory is **self-contained**: it tests a pre-built app binary (`.apk`/`.aab` for
Android, `.ipa` for iOS). It does **not** import or run the Sefaria-Mobile React Native source.

App identifier (both platforms): `org.sefaria.sefaria`.

---

## Commands

All commands run from `automatic-e2e-tests/`. There is no build step — `ts-node` transpiles on
the fly. There is no lint/typecheck script; `tsconfig.json` has `typeCheck: true` so `ts-node`
type-checks specs at run time.

```sh
npm install                       # install dependencies (Node >= 18)
```

Test scripts follow the pattern **`<suite>:<platform>:<env>`**:

- `<suite>` = `test` (every `tests/*.spec.ts`), `regression` (regression.spec.ts only), or `sanity` (sanity.spec.ts only)
- `<platform>` = `android` | `ios`
- `<env>` = `local` | `browserstack`

```sh
# Run a single suite locally (requires a running `appium` server)
npm run regression:android:local
npm run sanity:ios:local
npm run test:android:local        # ALL specs (regression + sanity)

# Same suites on BrowserStack (requires creds + uploaded app — see below)
npm run regression:ios:browserstack
npm run sanity:android:browserstack

# Parallel across the devices in devices.json (BrowserStack only)
npm run regression:android:parallel
npm run sanity:ios:parallel
npm run test:ios:parallel

# Clean logs/ and screenshots/ for a platform
npm run cleanup:android
npm run cleanup:ios
npm run cleanup                   # both
```

There is no built-in way to run a single `it` block by name. To focus during debugging, add
`.only` to an `it`/`describe` (e.g. `it.only(...)`) and **remove it before committing**.

---

## Environment variables

Configuration is entirely env-driven. Locally these come from a `.env` file (copy
`example.env` → `.env`); in CI they come from GitHub Secrets. `.env` is git-ignored.

| Variable | Set by | Purpose |
| --- | --- | --- |
| `PLATFORM` | npm script (`cross-env`) | `android` (default) or `ios`. Selects selector set + capabilities. |
| `RUN_ENV` | npm script | `local` (default) or `browserstack`. Selects Appium host + gesture distances. |
| `DEVICE_NAME` | parallel runner | Tags logs/build name per device; blank for single runs. |
| `BS_DEVICE`, `BS_OS_VERSION` | parallel runner | BrowserStack device model + OS, from `devices.json`. |
| `MOCHA_CONFIG` / `SPEC` | parallel runner | Lets the parallel runner target a specific `.mocharc` or spec. |
| `MODULARIZATION` | optional | Read in `regression.spec.ts` (`isModularization`); currently unused. |
| `GITHUB_ACTIONS` | CI | When `true`, `load_credentials` skips loading `.env` (uses CI env directly). |
| `LOCAL_DEVICE_NAME` | `.env` | Local device/emulator id (`adb devices` for Android). |
| `ANDROID_LOCAL_APP_PATH` / `IOS_LOCAL_APP_PATH` | `.env` | Absolute path to the local `.apk` / `.ipa`. |
| `BROWSERSTACK_USERNAME` / `BROWSERSTACK_ACCESS_KEY` | `.env` / Secrets | BrowserStack auth. |
| `ANDROID_BROWSERSTACK_APP_ID` / `IOS_BROWSERSTACK_APP_ID` | `.env` / Secrets | `bs://...` id returned after uploading the app. |

`utils/load_credentials.ts` collapses the platform-specific vars into generic
`LOCAL_APP_PATH` / `BROWSERSTACK_APP_ID` at startup based on `PLATFORM`.

> **BrowserStack gotcha:** the `*_BROWSERSTACK_APP_ID` changes on **every** app upload. After
> rebuilding the app, re-upload it and update the id (in `.env` locally, or the GitHub Secret
> for CI) or you will test a stale build.

---

## Architecture

Strictly layered. A test never talks to a selector or a raw WebdriverIO element directly —
it calls a component or util, which resolves a platform-correct selector from `Selectors`.

```text
tests/*.spec.ts          High-level user-flow scenarios (Mocha describe/it). No selectors, no logging.
   │  imports
   ▼
components/               Page Object Model — one file per app screen/feature.
   │  (Navbar, SearchPage, ReaderPage, DisplaySettings, TopicsPage)
   ▼
utils/                    Cross-cutting actions: gestures, text/element finding, color/pixel
   │                      checks, Sefaria API calls, BrowserStack reporting, popups, session opts.
   ▼
constants/               Timeouts, gesture config, colors, errors, text fixtures — and the
   │                      dynamic Selectors loader.
   ▼
selectors/<platform>/    Platform-specific element locators. selectors/android + selectors/ios.
```

**Dynamic platform loading is the keystone.** `constants/index.ts` reads `PLATFORM` and
`require()`s either `selectors/android/selectors.ts` or `selectors/ios/selectors.ts`, then
re-exports it as `Selectors`. Because both files export the **same keys** with the same
shapes, all components/utils/tests are written once against `Selectors.*` and work on both
platforms unchanged.

Both `components/index.ts` and `utils/index.ts` re-export their modules under PascalCase
namespaces (`Navbar`, `TextFinder`, `UiChecker`, …), so call sites read like
`Navbar.clickNavBarItem(...)`, `TextFinder.verifyHeaderOnPage(...)`.

### Session lifecycle (important — read before editing a spec)

Specs use **one Appium session per suite**, not per test:

- `before()` — `remote(LoadCredentials.getOpts(...))` opens the session, then
  `HelperFunctions.handleSetup(client, true)` dismisses the offline popup, waits for the
  navbar, taps Texts, and **starts a background popup monitor** (`PopUps.startGlobalPopupMonitor`,
  polls every 500 ms to auto-close donation pop-ups).
- `beforeEach()` — taps the Texts tab to return to a known home state. (It does **not** open a
  new session.)
- `afterEach()` — `HelperFunctions.handleTeardown(client, this, testTitle, false)` reports
  pass/fail to BrowserStack, screenshots on failure, and **keeps the session alive**
  (`deleteSession=false`).
- `after()` — stops the popup monitor, sets the final BrowserStack suite status, deletes the
  session, and prints a pass/fail summary.

Tests therefore are **not** fully independent of session state; each test is expected to leave
the app navigable and the next `beforeEach` resets to Texts. Keep tests resilient to that.

### Logging & artifacts

- `import '../log_init';` at the top of every spec mirrors `console.log/error/debug` into a
  timestamped **clean log** at `logs/<platform>/clean-<platform>-<device?>-<date>-<pid>.log`.
- The parallel runner additionally redirects each child's stdout/stderr into a
  `logs/<platform>/verbose-...log`.
- Failures save a screenshot to `screenshots/<platform>/FAIL_...png`; failed color checks also
  dump a cropped + full debug image there.
- `logs/` and `screenshots/` contents are git-ignored (the `android/`+`ios/` subfolders are kept).

---

## Conventions (follow these when adding code)

1. **Never put selectors or logging in test files.** Tests describe user flows; the *how*
   lives in components/utils. Components/utils do the `console.debug` and error throwing.
2. **Add every new selector to BOTH `selectors/android/selectors.ts` and
   `selectors/ios/selectors.ts` under the identical key.** This is what keeps the code
   cross-platform. If a selector is irrelevant on one platform, still add a placeholder/comment.
3. **Prefer robust locators** — content-desc / accessibility label / text over brittle
   index-based XPath. Index-based selectors (e.g. `VIEWGROUP_SELECTORS.byIndex`,
   `TOPICS_SELECTORS`) exist only where the app exposes no stable id, and they are known-flaky.
4. **Fail fast with actionable messages.** Throw via the helpers in `constants/errors.ts`
   (`logError`, `DYNAMIC_ERRORS.*`) so failures are logged and consistent.
5. **Import from the index barrels**, not individual files:
   `import { Navbar, SearchPage } from '../components';`
   `import { TextFinder, Gesture } from '../utils';`
   `import { Selectors, TEST_TIMEOUTS, Colors } from '../constants';`
6. **Document exported functions with JSDoc** (param/return/throws) — match the existing style.
7. **No magic numbers.** Use `constants/timeouts.ts`, `constants/gesture_constants.ts`,
   `constants/colors.ts`. Gesture distances/timings auto-scale for BrowserStack (slower devices).

---

## Platform & app gotchas (these have bitten people)

- **Search list won't appear unless the text is "still typing."** Appium sets the field value
  atomically, so the live results list often doesn't render. Workaround used in the specs: type
  the query with the **last characters truncated/repeated** so the field looks mid-edit
  (e.g. `"Sefat Emet, Genesis, Genesi"` then select `"Sefat Emet, Genesis, Genesis"`).
- **Hebrew double-quote breaks iOS XPath.** `תנ"ך` fails on iOS, so the specs match the prefix
  `'תנ'` instead. Avoid embedding `"` in Hebrew match strings.
- **English reader text needs an invisible LTR prefix.** `ReaderPage.findTextByAccessibilityId`
  with `isEnglish=true` prepends `ACCESSIBILITY_PATTERNS.englishTextPrefix` (`⁦`) because the
  app's accessibility ids carry it.
- **iOS elements exist in the DOM off-screen.** `gesture.ts` does a real viewport-bounds check
  (`isElementVisibleOnScreen`) for iOS rather than trusting `isDisplayed()`.
- **Android vs iOS scrolling differ.** `Gesture.autoScrollTextIntoView` uses Android
  `UiScrollable` natively and transparently falls back to `swipeIntoView` on iOS.
- **ViewGroup-index color checks are inherently flaky** (indexes shift as you scroll, and many
  colored UI elements have no id). REG-004 documents this; keep such checks above-the-fold.
- **Reader title locator differs:** Android `TextView.index(2)`, iOS `StaticText[1]`.

---

## File map

| Path | Role |
| --- | --- |
| `tests/regression.spec.ts` | Full E2E regression suite (REG-001…REG-008). |
| `tests/sanity.spec.ts` | Fast smoke suite (S001…S005). |
| `components/` | Page Object Model helpers (one file per screen) + `index.ts` barrel. |
| `utils/` | `gesture`, `text_finder`, `ui_checker`, `sefaria_api`, `browserstack_report`, `popups`, `load_credentials`, `helper_functions` + `index.ts`. |
| `constants/` | `timeouts`, `gesture_constants`, `colors`, `errors`, `text_constants` + `index.ts` (the dynamic `Selectors` loader). |
| `selectors/android/selectors.ts`, `selectors/ios/selectors.ts` | Platform locators (identical keys). |
| `scripts/run-parallel-tests.js` | Spawns one Mocha child per device in `devices.json` (BrowserStack). |
| `scripts/cleanup.js` | Whitelisted cleaner for `logs/`+`screenshots/` per platform. |
| `log_init.ts` | Console → clean-log file mirroring + uncaught-error capture. |
| `devices.json` | Device matrix for parallel/BrowserStack runs. |
| `.mocharc.json` / `.mocharc.regression.json` / `.mocharc.sanity.json` | Mocha configs (all-but-sanity / regression-only / sanity-only). |
| `example.env` | Template for `.env`. |
| `.github/workflows/*-browserstack-testing.yml` | Manual (`workflow_dispatch`) CI runs (in the repo root, one level up). |

---

## Docs index

- `README.md` — overview + quick start + command reference.
- `SETUP.md` — install, local device/emulator, BrowserStack & GitHub Actions, troubleshooting, Appium Inspector configs.
- `TEST_GUIDE.md` — how to author tests, components, and utilities.
- `FILE_OVERVIEW.md` — per-file/folder reference.
