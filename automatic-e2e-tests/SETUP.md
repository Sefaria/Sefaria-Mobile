# SETUP

This guide explains how to configure, run, and troubleshoot automated end-to-end tests for the Sefaria mobile app.

---

## Quick Start

> **Already familiar with Node.js, Appium, and Android tools?**  
> Place your `.env` in the `android/` directory.

1. **Install Node.js 18+ and npm**
2. **Install Appium CLI and driver:**
    ```sh
    npm install -g appium
    appium driver install uiautomator2
    ```
3. **Install Android platform-tools & set `PATH`/`ANDROID_HOME`**
4. **Enable USB debugging on your device**
5. **Copy and edit `.env` in `android/`** ([see below](#env-setup))
6. **Start Appium:** `appium`
7. **Run tests:**
    ```sh
    cd android
    npm install
    npm test
    ```

> **BrowserStack?**  
> Set credentials and app ID in `.env`, upload your app for each build, set `RUN_ENV=browserstack`.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Running Tests Locally](#running-tests-locally)
- [BrowserStack](#browserstack)
- [GitHub Actions](#github-actions)
- [Logs & Cleanup](#logs--cleanup)
- [Troubleshooting](#troubleshooting)
- [Example .env](#example-env)
- [Appium Inspector](#appium-inspector)
- [Help](#help)

---

## Prerequisites

1. **Node.js 18+**  
    [Download](https://nodejs.org/).  
    Verify: `node -v` and `npm -v`

2. **Appium CLI**  
    ```sh
    npm install -g appium
    appium driver install uiautomator2
    ```
    Start Appium in a separate terminal: `appium`

3. **Android SDK / Platform-Tools**  
    - [Android Studio](https://developer.android.com/studio) (full SDK) **or** [Platform-tools only](https://developer.android.com/tools/releases/platform-tools#downloads)
    - Add `platform-tools` to your `PATH` and set `ANDROID_HOME`:
      - **Windows:** Use Environment Variables in System Properties.
      - **Mac/Linux:** Add to `.bashrc`/`.zshrc`:
         ```sh
         export ANDROID_HOME=/path/to/Android/Sdk
         export PATH=$PATH:$ANDROID_HOME/platform-tools
         ```
    - Verify: `adb version`

4. **Enable USB Debugging**  
    - On device: Settings > About phone > Tap "Build number" 7x > Developer Options > Enable "USB debugging".

5. **Get Device ID**  
    ```sh
    adb devices
    ```
    Copy the device ID.

6. <a id="env-setup"></a>**Set Up `.env` in `android/`**
    - Copy `example.env` to `.env`
    - Edit:
      ```
      LOCAL_DEVICE_NAME=your_device_id
      LOCAL_APP_PATH=full_path_to_sefaria_app.apk
      ```
    - For BrowserStack, add:
      ```
      BROWSERSTACK_USERNAME=your_username
      BROWSERSTACK_ACCESS_KEY=your_key
      BROWSERSTACK_APP_ID=bs://your_app_id
      RUN_ENV=browserstack
      ```

---

## Running Tests Locally

1. **Start Appium:**  
    ```sh
    appium
    ```
2. **Connect device:**  
    ```sh
    adb devices
    ```
3. **Run tests:**  
    ```sh
    cd android
    npm install
    npm test
    ```

---

## BrowserStack

- Update `.env` with BrowserStack credentials and app ID (from [dashboard](https://www.browserstack.com/)).
- Upload your app for each build; update `BROWSERSTACK_APP_ID`.
- Run tests as usual: `npm test`

---

## GitHub Actions

- Push your branch to GitHub.
- Go to **Actions** tab > **Run BrowserStack** workflow > **Run workflow**.
- Monitor progress and download logs/artifacts from the run summary.
- Ensure required GitHub Secrets are set (`BROWSERSTACK_USERNAME`, `BROWSERSTACK_ACCESS_KEY`).

---

## Logs & Cleanup

- Logs: `android/logs-test/`
- Screenshots: `android/diff-images/`
- Clean up:
  ```sh
  npm run cleanup
  ```
- Clean & test:
  ```sh
  npm run test:clean
  ```

---

## Troubleshooting

- **Device not found:** Check USB debugging, cable, and run `adb kill-server && adb start-server`.
- **'unauthorized' device:** Reconnect, accept prompt on device, or toggle USB debugging.
- **Appium not running:** Start with `appium`.
- **PATH/ANDROID_HOME issues:** Double-check environment variables, restart terminal.
- **uiautomator2 missing:** `appium driver install uiautomator2`
- **BrowserStack errors:** Check credentials/app ID, upload app.
- **Windows script errors:**  
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
  ```
- **Test hangs:** Restart device/emulator and Appium.
- **Single test:** Use `.only` in your test file.
- **npm/appium issues:** Try `npm cache clean --force`, restart terminal.

---

## Example .env

```properties
# BrowserStack
BROWSERSTACK_USERNAME=your_username
BROWSERSTACK_ACCESS_KEY=your_key
BROWSERSTACK_APP_ID=bs://your_app_id

# Local
LOCAL_DEVICE_NAME=your_device_id
LOCAL_APP_PATH=path_to_apk_or_aab

RUN_ENV=local # or 'browserstack'
```

---

## Appium Inspector

- [Download Appium Inspector](https://github.com/appium/appium-inspector/releases)
- Example config (replace `DEVICE_ID` and `APK_PATH`):
  ```json
  {
     "platformName": "Android",
     "appium:automationName": "UiAutomator2",
     "appium:deviceName": "DEVICE_ID",
     "appium:app": "APK_PATH",
     "appium:appPackage": "org.sefaria.sefaria",
     "appium:appActivity": "org.sefaria.sefaria.SplashActivity"
  }
  ```
- **Java JDK required:** [Download](https://adoptium.net/), set `JAVA_HOME`.

---

## Help

- **GitHub Issues:** [Sefaria-Mobile](https://github.com/Sefaria/Sefaria-Mobile.git)
- **Contact:** [Sefaria Developer Portal](https://developers.sefaria.org/page/contact-us)
- **Slack:** #sefaria-team (if available)
- See [Troubleshooting](#troubleshooting) above.

