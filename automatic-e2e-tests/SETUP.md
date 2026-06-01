# Setup & Environment Guide

How to install, configure, run, and troubleshoot the Sefaria Mobile E2E tests on **Android**
and **iOS**, both locally and in the cloud (BrowserStack / GitHub Actions).

New here? Read [README.md](./README.md) first for the high-level picture, then come back.

---

## Table of contents

- [Prerequisites](#prerequisites)
- [The `.env` file](#the-env-file)
- [Android SDK (command-line-only) setup](#android-sdk-command-line-only-setup)
- [Local device / emulator setup](#local-device--emulator-setup)
- [Logs, screenshots & cleanup](#logs-screenshots--cleanup)
- [Cloud & CI setup (BrowserStack & GitHub Actions)](#cloud--ci-setup-browserstack--github-actions)
- [Troubleshooting](#troubleshooting)
- [Appium Inspector](#appium-inspector)

---

## Prerequisites

1. **Node.js ≥ 18** (CI uses Node 22).
2. **Project dependencies** — from `automatic-e2e-tests/`:

   ```sh
   npm install
   ```

3. **Appium + drivers** (needed for local runs; BrowserStack provides its own):

   ```sh
   npm install -g appium
   appium driver install uiautomator2   # Android
   appium driver install xcuitest        # iOS (Mac only)
   ```

4. **Platform toolchain:**
   - **Android** — the Android SDK `platform-tools` (for `adb`) and `build-tools`. You do
     **not** need Android Studio; the [command-line tools](https://developer.android.com/studio#command-line-tools-only)
     are enough (see [below](#android-sdk-command-line-only-setup)).
   - **iOS (Mac only)** — Xcode from the Mac App Store + command-line tools
     (`xcode-select --install`).
5. **Java JDK** — required by Appium/UiAutomator2. [Download from Adoptium](https://adoptium.net/)
   and set `JAVA_HOME`.

---

## The `.env` file

Copy the template and fill it in. `.env` lives in the root of `automatic-e2e-tests/` and is
git-ignored.

```sh
cp example.env .env          # Windows: copy example.env .env
```

| Variable | When you need it | Notes |
| --- | --- | --- |
| `LOCAL_DEVICE_NAME` | Local runs | Device/emulator id. Android: run `adb devices` (status must read `device`, not `unauthorized`). |
| `ANDROID_LOCAL_APP_PATH` | Local Android | **Absolute** path to your `.apk`, e.g. `C:\Users\me\app\sefaria.apk`. |
| `IOS_LOCAL_APP_PATH` | Local iOS | **Absolute** path to your `.ipa`, e.g. `/Users/me/app/sefaria.ipa`. |
| `BROWSERSTACK_USERNAME` | BrowserStack | From your [BrowserStack account](https://www.browserstack.com/users/sign_in). |
| `BROWSERSTACK_ACCESS_KEY` | BrowserStack | From your BrowserStack account. |
| `ANDROID_BROWSERSTACK_APP_ID` | BrowserStack Android | The `bs://...` id returned after uploading the app. |
| `IOS_BROWSERSTACK_APP_ID` | BrowserStack iOS | The `bs://...` id returned after uploading the app. |

`PLATFORM` (`android`/`ios`) and `RUN_ENV` (`local`/`browserstack`) are set automatically by
the npm scripts — you don't put them in `.env`. At startup `utils/load_credentials.ts` picks
the right `*_LOCAL_APP_PATH` / `*_BROWSERSTACK_APP_ID` based on `PLATFORM`.

> **You only need the variables for the mode you're running.** Local runs need
> `LOCAL_DEVICE_NAME` + the matching `*_LOCAL_APP_PATH`. BrowserStack runs need the username,
> access key, and the matching `*_BROWSERSTACK_APP_ID`.

---

## Android SDK (command-line-only) setup

You do **not** need Android Studio — install just the SDK via command-line tools. Download the
[Command Line Tools](https://developer.android.com/studio#command-line-tools-only) for your OS.

**Windows (detailed):**

1. Create `C:\Android` and extract the tools ZIP into it.
2. Under `C:\Android\cmdline-tools\`, create a folder named `latest`, then move the extracted
   `lib` and `bin` folders into it. Final structure:
   `C:\Android\cmdline-tools\latest\bin` and `C:\Android\cmdline-tools\latest\lib`.
3. Set system environment variables:
   - `ANDROID_SDK_ROOT = C:\Android`
   - Add to `PATH`:
     - `C:\Android\cmdline-tools\latest\bin`
     - `C:\Android\platform-tools`
     - `C:\Android\build-tools\<version>` (e.g. `34.0.0`)
4. Install SDK packages (open a fresh terminal so the new `PATH` is picked up):

   ```sh
   sdkmanager --sdk_root="C:\Android" "platform-tools" "build-tools;34.0.0"
   sdkmanager --list      # to see available build-tools versions
   ```

5. Verify:

   ```sh
   adb version
   ```

---

## Local device / emulator setup

Runs against a physical device, Android emulator, or iOS simulator through a **local Appium
server**. Fast for development and debugging.

### Android

1. Enable **USB debugging** on the device (or start an emulator).
2. Find the device id:

   ```sh
   adb devices
   ```

   Put it in `.env` as `LOCAL_DEVICE_NAME`, and set `ANDROID_LOCAL_APP_PATH` to your `.apk`.
3. Start Appium in a separate terminal:

   ```sh
   appium
   ```

4. Run a suite:

   ```sh
   npm run sanity:android:local        # fast smoke
   npm run regression:android:local    # full suite
   ```

### iOS (Mac only)

1. Enable developer mode on the device (or start a simulator).
2. In `.env`, set `LOCAL_DEVICE_NAME` and `IOS_LOCAL_APP_PATH` (your `.ipa`).
3. Start Appium:

   ```sh
   appium
   ```

4. Run a suite:

   ```sh
   npm run sanity:ios:local
   npm run regression:ios:local
   ```

---

## Logs, screenshots & cleanup

Artifacts are organized by platform under `logs/` and `screenshots/` (both git-ignored; the
`android/`+`ios/` subfolders are kept):

- **Clean logs** — `logs/<platform>/clean-*.log`. Reader-friendly test output (start/finish,
  pass/fail, debug messages), written by `log_init.ts`.
- **Verbose logs** — `logs/<platform>/verbose-*.log`. Full Appium/WebdriverIO chatter, written
  by the parallel runner (`scripts/run-parallel-tests.js`).
- **Screenshots** — `screenshots/<platform>/FAIL_*.png` on a test failure; failed color checks
  also save cropped + full debug images.

Clean up between runs:

```sh
npm run cleanup            # both platforms
npm run cleanup:android
npm run cleanup:ios
```

---

## Cloud & CI setup (BrowserStack & GitHub Actions)

Runs on real devices in the cloud — best for cross-device/OS coverage.

### BrowserStack

[BrowserStack](https://www.browserstack.com/) runs your tests on real devices without you
owning them.

1. **Upload the app** to BrowserStack via the
   [App Upload page](https://app-automate.browserstack.com/dashboard/v2/app-upload). Copy the
   returned `bs://<app-id>`.
2. **Update `.env`** in `automatic-e2e-tests/`:
   - `BROWSERSTACK_USERNAME` and `BROWSERSTACK_ACCESS_KEY` (from your dashboard).
   - `ANDROID_BROWSERSTACK_APP_ID` and/or `IOS_BROWSERSTACK_APP_ID` = the `bs://...` id.

   ```env
   BROWSERSTACK_USERNAME=your_username
   BROWSERSTACK_ACCESS_KEY=your_access_key
   ANDROID_BROWSERSTACK_APP_ID=bs://abc123...
   IOS_BROWSERSTACK_APP_ID=bs://def456...
   ```

   > **You must re-upload the app every time you build a new `.apk`/`.aab`/`.ipa`.** The App ID
   > changes on every upload, so always refresh `*_BROWSERSTACK_APP_ID`.
3. **Run:**

   ```sh
   npm run regression:android:browserstack
   npm run regression:ios:browserstack
   # or sanity:*, or *:parallel to fan out across devices.json
   ```

The device matrix for parallel runs lives in [`devices.json`](./devices.json) — edit the
`browserstack.device` / `browserstack.os_version` entries to change coverage.

See the [BrowserStack Appium docs](https://www.browserstack.com/docs/app-automate/appium/getting-started)
for more.

### GitHub Actions

Two manual workflows live in the repo root at `.github/workflows/`
(`android-browserstack-testing.yml`, `ios-browserstack-testing.yml`):

1. Push your branch to GitHub.
2. Go to the **Actions** tab → **Run Android/iOS BrowserStack Tests** → **Run workflow**
   (they are `workflow_dispatch`, i.e. manual trigger only).
3. Monitor progress; download logs/screenshots from the run's **Artifacts** section
   (logs always upload; screenshots upload on failure).

Required **GitHub Secrets**:

- `BROWSERSTACK_USERNAME`
- `BROWSERSTACK_ACCESS_KEY`
- `ANDROID_BROWSERSTACK_APP_ID` (Android workflow) and/or `IOS_BROWSERSTACK_APP_ID` (iOS workflow)

The workflows set `PLATFORM`, `RUN_ENV=browserstack`, and `GITHUB_ACTIONS=true` for you
(the last makes the framework read CI env vars directly instead of a `.env` file).

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| **Device not found** | Check USB debugging/cable; `adb kill-server && adb start-server`. Ensure `adb devices` shows `device`, not `unauthorized`. |
| **Appium not running** | Start it: `appium` (local runs only). |
| **`PATH`/`ANDROID_SDK_ROOT` issues** | Recheck env vars and restart the terminal. |
| **Local APK/IPA won't install** | Confirm `platform-tools` + `build-tools` installed, `ANDROID_SDK_ROOT` set, `apksigner` present (Android); Xcode installed + developer mode on (iOS). |
| **App not found and no local path set** | If `*_LOCAL_APP_PATH` is unset, the run expects the app already installed on the device, or errors — set the path or pre-install. |
| **Java errors** | Install a JDK ([Adoptium](https://adoptium.net/)) and set `JAVA_HOME`. |
| **`uiautomator2` / `xcuitest` missing** | `appium driver install uiautomator2` / `appium driver install xcuitest`. |
| **BrowserStack errors** | Recheck credentials and App ID; confirm the file type the device needs (`.aab`/`.ipa`); make sure you re-uploaded after rebuilding. |
| **Windows: script execution disabled** | `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` |
| **Only one test runs** | Remove a stray `.only` from a spec. |
| **npm / Appium acting up** | `npm cache clean --force` then reinstall. |

---

## Appium Inspector

[Appium Inspector](https://github.com/appium/appium-inspector/releases) is a GUI for inspecting
app elements and finding locators — invaluable when writing new selectors, components, or
utilities.

**Android config:**

```json
{
  "platformName": "Android",
  "appium:automationName": "UiAutomator2",
  "appium:deviceName": "DEVICE_ID",
  "appium:app": "APK_PATH",
  "appium:noReset": false,
  "appium:autoGrantPermissions": true,
  "appium:appPackage": "org.sefaria.sefaria",
  "appium:appWaitActivity": "*",
  "appium:appActivity": "org.sefaria.sefaria.SplashActivity",
  "appium:appWaitDuration": 30000,
  "appium:adbExecTimeout": 60000
}
```

**iOS config:**

```json
{
  "platformName": "iOS",
  "appium:automationName": "XCUITest",
  "appium:deviceName": "DEVICE_ID",
  "appium:app": "IPA_PATH",
  "appium:noReset": false,
  "appium:autoAcceptAlerts": true,
  "appium:bundleId": "org.sefaria.sefaria",
  "appium:wdaStartupRetries": 2,
  "appium:wdaStartupRetryInterval": 20000
}
```

These mirror the capabilities in [`utils/load_credentials.ts`](./utils/load_credentials.ts) —
keep them in sync if the real capabilities change.

---

[⬅ Back to README](./README.md)
