# Sefaria Mobile — Automated E2E Testing

Cross-platform end-to-end UI tests for the **Sefaria Mobile** app, running on **Android and
iOS** from a single shared TypeScript codebase.

The framework drives a real or virtual device through [Appium](https://appium.io/) +
[WebdriverIO](https://webdriver.io/), orchestrated by [Mocha](https://mochajs.org/), and runs
either **locally** (your own device/emulator) or in the **cloud** via
[BrowserStack](https://www.browserstack.com/) and GitHub Actions.

---

## Table of contents

- [What this is](#what-this-is)
- [Quick links](#quick-links)
- [Quick start](#quick-start)
- [Command reference](#command-reference)
- [How it works](#how-it-works)
- [Project layout](#project-layout)
- [Execution modes](#execution-modes)
- [Help & support](#help--support)

---

## What this is

- **Purpose:** Automate Sefaria Mobile user flows and UI validation so regressions are caught
  before release, across multiple devices and OS versions.
- **Scope:** Tests run against a pre-built app binary — `.apk`/`.aab` (Android) or `.ipa`
  (iOS). They install and launch the app directly.
- **Tech stack:** Appium (device automation) · WebdriverIO (driver) · Mocha (test runner) ·
  TypeScript (`ts-node`, no build step) · axios (Sefaria calendar API) · pngjs (pixel checks).

> **You do not need the Sefaria-Mobile app source code, nor a running dev server.** This
> directory is self-contained — clone/download just `automatic-e2e-tests/` and point it at an
> app binary (local) or an uploaded BrowserStack build (cloud).

---

## Quick links

| Doc | What's inside |
| --- | --- |
| [SETUP.md](./SETUP.md) | Install dependencies, configure a device, run locally or on CI, troubleshooting, Appium Inspector. |
| [TEST_GUIDE.md](./TEST_GUIDE.md) | How to write tests, build reusable components (Page Objects), and add utilities. |
| [FILE_OVERVIEW.md](./FILE_OVERVIEW.md) | Reference for every file and folder. |
| [CLAUDE.md](./CLAUDE.md) | Condensed architecture/conventions/gotchas guide (for AI agents and fast onboarding). |

---

## Quick start

Local Android, in three steps (full details in [SETUP.md](./SETUP.md)):

```sh
# 1. Install
npm install

# 2. Configure: copy the template and fill in device + app path
cp example.env .env        # then edit .env (Windows: copy example.env .env)

# 3. Start a local Appium server in another terminal, then run a suite
appium
npm run sanity:android:local
```

Prerequisites at a glance: **Node.js ≥ 18**, **Appium** (`npm i -g appium`) with the
`uiautomator2` (Android) and/or `xcuitest` (iOS) drivers, the Android SDK platform-tools
and/or Xcode, and a Java JDK. See [SETUP.md](./SETUP.md) for OS-specific instructions.

---

## Command reference

All scripts run from `automatic-e2e-tests/`. Script names follow
**`<suite>:<platform>:<env>`**.

| Token | Values | Meaning |
| --- | --- | --- |
| `<suite>` | `test` · `regression` · `sanity` | `test` = **all** specs · `regression` = `regression.spec.ts` · `sanity` = `sanity.spec.ts` |
| `<platform>` | `android` · `ios` | Selects selectors + capabilities |
| `<env>` | `local` · `browserstack` | Local Appium server vs. BrowserStack cloud |

**Regression (full suite):**

```sh
npm run regression:android:local
npm run regression:ios:local
npm run regression:android:browserstack
npm run regression:ios:browserstack
```

**Sanity (fast smoke suite):**

```sh
npm run sanity:android:local
npm run sanity:ios:local
npm run sanity:android:browserstack
npm run sanity:ios:browserstack
```

**All specs at once (`tests/*.spec.ts`):**

```sh
npm run test:android:local
npm run test:ios:local
npm run test:android:browserstack
npm run test:ios:browserstack
```

**Parallel across multiple devices** (BrowserStack only; devices come from
[`devices.json`](./devices.json)):

```sh
npm run regression:android:parallel
npm run regression:ios:parallel
npm run sanity:android:parallel
npm run sanity:ios:parallel
npm run test:android:parallel      # all specs, per device
npm run test:ios:parallel
```

**Clean up logs & screenshots:**

```sh
npm run cleanup            # both platforms
npm run cleanup:android
npm run cleanup:ios
```

> **Debugging a single test:** add `.only` to an `it`/`describe` block, then **remove it
> before committing**. If only one test seems to run, a stray `.only` is the usual cause.

---

## How it works

The codebase is strictly layered, so a test reads like a user story and never touches a raw
selector:

```text
tests/  →  components/ (Page Objects)  →  utils/  →  constants/  →  selectors/<platform>/
```

- **Dynamic platform loading:** `constants/index.ts` reads the `PLATFORM` env var and loads
  either `selectors/android/selectors.ts` or `selectors/ios/selectors.ts`, exposing them as
  `Selectors`. Both selector files share identical keys, so every component, util, and test is
  written once and runs on both platforms.
- **One session per suite:** each spec opens a single Appium session in `before()`, resets to
  the Texts tab in `beforeEach()`, reports results in `afterEach()`, and tears down in
  `after()`. A background monitor auto-closes donation pop-ups during the run.
- **Logging & artifacts:** human-readable logs land in `logs/<platform>/clean-*.log`; failures
  save screenshots to `screenshots/<platform>/`.

For the full picture — conventions, gotchas, and the session lifecycle — see
[CLAUDE.md](./CLAUDE.md) and [TEST_GUIDE.md](./TEST_GUIDE.md).

---

## Project layout

```text
automatic-e2e-tests/
├── tests/             # regression.spec.ts, sanity.spec.ts
├── components/        # Page Object Model helpers (navbar, search, reader, topics, display settings)
├── utils/             # gestures, text finding, color checks, Sefaria API, BrowserStack reporting, popups, session opts
├── constants/         # timeouts, gestures, colors, errors, text fixtures + dynamic Selectors loader
├── selectors/         # android/ and ios/ locator sets (identical keys)
├── scripts/           # run-parallel-tests.js, cleanup.js
├── logs/ screenshots/ # generated artifacts (git-ignored)
├── devices.json       # device matrix for parallel/BrowserStack runs
├── .mocharc*.json     # Mocha configs (all / regression / sanity)
├── log_init.ts        # console → log-file mirroring
└── example.env        # copy to .env and fill in
```

See [FILE_OVERVIEW.md](./FILE_OVERVIEW.md) for a per-file description.

---

## Execution modes

- **Local** — runs on your own Android device/emulator or iOS simulator through a local Appium
  server. Fast for development and debugging.
- **Cloud / CI** — runs on real devices via BrowserStack, optionally triggered from GitHub
  Actions. Best for cross-device/OS validation.

  > You must upload each new app build to BrowserStack and update the App ID
  > (`*_BROWSERSTACK_APP_ID`) before running — the id changes on every upload. See
  > [SETUP.md › Cloud & CI Setup](./SETUP.md#cloud--ci-setup-browserstack--github-actions).

---

## Help & support

- **Issues:** [Sefaria-Mobile on GitHub](https://github.com/Sefaria/Sefaria-Mobile/issues)
- **Contact:** [Sefaria Developer Portal](https://developers.sefaria.org/page/contact-us)
- **Troubleshooting:** [SETUP.md › Troubleshooting](./SETUP.md#troubleshooting)
