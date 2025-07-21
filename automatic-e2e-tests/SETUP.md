# SETUP

This guide explains how to configure, run, and troubleshoot automated end-to-end tests for the Sefaria mobile app.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Device/Emulator Setup](#local-deviceemulator-setup)
- [Cloud & CI Setup (BrowserStack & GitHub Actions)](#cloud--ci-setup-browserstack--github-actions)
- [Troubleshooting](#troubleshooting)
- [Appium Inspector](#appium-inspector)

---

## Prerequisites

1. **Node.js 18+**
2. **Appium CLI**
   ```sh
   npm install -g appium
   appium driver install uiautomator2
   ```
3. **Android SDK / Platform-Tools**
   - [Android Studio](https://developer.android.com/studio) or [Platform-tools only](https://developer.android.com/tools/releases/platform-tools)
   - Add `platform-tools` to your `PATH` and set `ANDROID_HOME`.
   - Verify: `adb version`
4. **Enable USB Debugging** on your device or use an emulator (like Android Studio)
5. **Get Device ID:**
   ```sh
   adb devices
   ```
6. **Copy example.env:**
   Copy `android/example.env` to `android/.env` and read the comments to configure your environment.


---

## Local Device/Emulator Setup

This mode runs tests on a physical device connected via USB or Android emulator. Useful for local development and debugging.

### Running Tests Locally

1. **Start Appium:**

   ```sh
   appium
   ```

2. **Run tests:** In a separate terminal (Appium runs in the background)

   ```sh
   cd android
   npm install
   npm test
   ```

### Logs & Cleanup

- Logs: `android/logs-test/` (generated for each test run)
- Screenshots: `android/diff-images/` (taken for failed visual checks)
- Clean up:

  ```sh
  npm run cleanup
  ```

- Clean & test:

  ```sh
  npm run test:clean
  ```

---

## Cloud & CI Setup (BrowserStack & GitHub Actions)

This mode runs tests on real devices in the cloud using BrowserStack and can be automated via GitHub Actions. Useful for cross-device/OS validation and CI integration.

### BrowserStack

[BrowserStack](https://www.browserstack.com/) is a cloud-based service for running automated tests on real devices. It allows you to test your app on multiple device models and OS versions without needing physical devices.

**How to use BrowserStack for Sefaria tests:**

1. **Update `.env` with your BrowserStack credentials and App ID:**
   - Get your username and access key from your [BrowserStack dashboard](https://www.browserstack.com/users/sign_in).
   - Upload your APK/AAB file to BrowserStack using their [App Upload page](https://app-automate.browserstack.com/dashboard/v2/app-upload).
   - Copy the App ID (e.g., `bs://<app-id>`) and set it in your `.env` as `BROWSERSTACK_APP_ID`.
   - **Note:** You must upload your app every time you build a new APK/AAB. The App ID changes with each upload, so always update `BROWSERSTACK_APP_ID` in your `.env`.

2. **Run tests as usual:**

   ```sh
   npm test
   ```

For more details, see [BrowserStack documentation](https://www.browserstack.com/docs/app-automate/appium/getting-started).

### GitHub Actions

- Push your branch to GitHub.
- Go to **Actions** tab > **Run BrowserStack** workflow > **Run workflow**.
- Monitor progress and download logs/artifacts from the run summary.
- Ensure required GitHub Secrets are set (`BROWSERSTACK_USERNAME`, `BROWSERSTACK_ACCESS_KEY`, `BROWSERSTACK_APP_ID`, `RUN_ENV` (set to browserstack)).

---

## Troubleshooting

- **Device not found:** Check USB debugging, cable, and run `adb kill-server && adb start-server`.
- **Appium not running:** Open a terminal and start Appium by typing `appium`.
- **PATH/ANDROID_HOME issues:** Double-check system environment variables, restart terminal.
- **Java JDK required:** [Download](https://adoptium.net/), set `JAVA_HOME`.
- **uiautomator2 missing:** `appium driver install uiautomator2`
- **BrowserStack errors:** Check credentials/app ID, make sure app is uploaded.
   - Sometimes browserstack wants aab files instead of apk files, so make sure you upload the correct file.
- **Windows Execution Disabled:**

  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
  ```

- **Is only one test running?** Check your test files for `.only` (e.g., `describe.only` or `it.only`).
- **npm/appium issues:** Try `npm cache clean --force`, restart terminal.

---

## Appium Inspector

- [Download Appium Inspector](https://github.com/appium/appium-inspector/releases)
- Example config (replace `DEVICE_ID` and `APK_PATH`):

  ```json
   {
      "platformName": "Android",
      "appium:automationName": "UiAutomator2",
      "appium:deviceName": "DEVICE_ID", // Change to your device name ('adb devices')
      "appium:app": "APK_PATH", // Path to your app APK
      "appium:noReset": false,
      "appium:autoGrantPermissions": true,
      "appium:appPackage": "org.sefaria.sefaria",
      "appium:appWaitActivity": "*",
      "appium:appActivity": "org.sefaria.sefaria.SplashActivity",
      "appium:appWaitDuration": 30000,
      "appium:adbExecTimeout": 60000
   }
  ```

---

[⬅ README](./README.md)
