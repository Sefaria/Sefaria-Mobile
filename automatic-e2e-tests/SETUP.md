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

3. **Android SDK (Command Line Only Setup)**
   You do **not** need Android Studio. You can install just the SDK using command-line tools:

   * Download the [Command Line Tools for Windows](https://developer.android.com/studio#command-line-tools-only).
   * Create `Android` directory in `C:\` (e.g., `C:\Android`).
   * Extract the downloaded ZIP file to `C:\Android`.
      
      (After extracting, navigate to `C:\Android\cmdline-tools\` and create a folder named `latest` if it does not exist. 
      
      Then move the `lib` and `bin` folders into `C:\Android\cmdline-tools\latest\`.
      
      Thus, final structure is 
      
      `C:\Android\cmdline-tools\latest\bin` and `C:\Android\cmdline-tools\latest\lib`.)
     
  * **Set system environment variables:**

    1. **ANDROID_SDK_ROOT**  
       Add a new system environment variable:  
       `ANDROID_SDK_ROOT = C:\Android`

    2. **PATH**  
       Edit your system `PATH` variable and add the following directories (each as a separate entry):  
       - `C:\Android\cmdline-tools\latest\bin`
       - `C:\Android\platform-tools`
       - `C:\Android\build-tools\<version>` (replace `<version>` with your chosen build tools version, e.g., `34.0.0`)

    3. **Install SDK packages:**  
       Open a new terminal and run:
       ```sh
       sdkmanager --sdk_root="C:\Android" "platform-tools" "build-tools;<version>"
       ```
       Replace `<version>` with the specific build tools version you need (e.g., `34.0.0`, `35.0.0`, `36.0.0`).  
       You can install multiple build tools versions to match the Android versions you want to test on.  
       To see all available build tools versions, run:
       ```sh
       sdkmanager --list
       ```

   * Verify:

     ```sh
     adb version
     ```

4. **Enable USB Debugging** on your device or use an emulator

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

2. **Run tests:** In a separate terminal

   ```sh
   cd android
   npm install
   npm test
   ```

### Logs & Cleanup

* Logs: `android/logs-test/` (generated for each test run)
* Screenshots: `android/diff-images/` (taken for failed visual checks)
* Clean up:

  ```sh
  npm run cleanup
  ```
* Clean & test:

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

2. **Run tests:**

   ```sh
   npm test
   ```

See [BrowserStack docs](https://www.browserstack.com/docs/app-automate/appium/getting-started) for more.

### GitHub Actions

- Push your branch to GitHub.
- Go to **Actions** tab > **Run BrowserStack** workflow > **Run workflow**.
- Monitor progress and download logs/artifacts from the run summary.
- Ensure required GitHub Secrets are set (`BROWSERSTACK_USERNAME`, `BROWSERSTACK_ACCESS_KEY`, `BROWSERSTACK_APP_ID`, `RUN_ENV` (set to browserstack)).

---

## Troubleshooting

* **Device not found:** Check USB debugging and cables; restart `adb`:

  ```sh
  adb kill-server && adb start-server
  ```

* **Appium not running:** Run `appium` in a terminal.

* **PATH/ANDROID\_SDK\_ROOT issues:** Double-check env vars, restart terminal.

* **Testing a local APK?**
  If `LOCAL_APP_PATH` is set in `.env`, ensure:

  * You have installed `platform-tools` and `build-tools`
  * `ANDROID_SDK_ROOT` is correctly set
  * `apksigner.bat` is available in `C:\Android\build-tools\34.0.0\`

* **Not using local APK?**
  If `LOCAL_APP_PATH` is commented out, the test expects the app to already be installed on the device.

* **Java JDK required:** [Download](https://adoptium.net/) and set `JAVA_HOME`

* **uiautomator2 missing:**

  ```sh
  appium driver install uiautomator2
  ```

* **BrowserStack errors:**

  * Check credentials, App ID, and file type (some devices require `.aab`)

* **Windows Execution Disabled:**

  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
  ```

* **Only one test running?** Remove `.only` from test files.

* **npm/appium issues:**

  ```sh
  npm cache clean --force
  ```

---

## Appium Inspector

* [Download Appium Inspector](https://github.com/appium/appium-inspector/releases)
* Example config:

  ```json
  {
    "platformName": "Android",
    "appium:automationName": "UiAutomator2",
    "appium:deviceName": "DEVICE_ID", // `adb devices` to find your device ID
    "appium:app": "APK_PATH", // Path to your local APK
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
