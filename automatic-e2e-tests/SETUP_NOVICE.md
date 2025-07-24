# SETUP
This `SETUP.md` provides comprehensive instructions for configuring, running, and troubleshooting automated end-to-end tests for the Sefaria mobile app. It covers prerequisites (Node.js, Appium, Android SDK/platform-tools), device setup, environment variable configuration, and step-by-step guides for running tests locally, on BrowserStack, and via GitHub Actions. The guide also explains log management, cleanup commands, troubleshooting common issues, and using Appium Inspector for UI exploration.


---

## Cloning the Repository
  - Install [Git](https://git-scm.com/downloads) if you don't have it.
  - Clone with:
    ```sh
    git clone https://github.com/Sefaria/Sefaria-Mobile.git
    ```

---

## Table of Contents

- [Quick Start (for Advanced Users)](#quick-start-for-advanced-users)
- [Prerequisites](#prerequisites)
  - [Node.js](#1-nodejs)
  - [Appium](#2-appium)
  - [Android SDK & Platform-Tools](#3-android-sdk--platform-tools)
  - [Enable USB Debugging on Android](#4-enable-usb-debugging-on-android)
  - [Get Your Device ID](#5-get-your-device-id)
  - [Set Up Your .env File](#6-set-up-your-env-file)
- [Running Tests Locally](#running-tests-locally)
- [Running Tests on BrowserStack](#running-tests-on-browserstack)
- [Running Tests with GitHub Actions](#running-tests-with-github-actions-ci)
- [Test Logs](#test-logs)
- [Cleaning Up Test Logs and Screenshots](#cleaning-up-test-logs-and-screenshots)
- [Troubleshooting](#troubleshooting)
- [Example .env File](#example-env-file)
- [Notes](#notes)
- [Getting Help](#getting-help)
- [Using Appium Inspector](#using-appium-inspector)

---

## Quick Start (for Advanced Users)

> ⚡️ **Quick Start:**
> 
> If you are new to Node.js, Appium, or Android tools, **skip this section** and [jump to the detailed prerequisites](#prerequisites) below.
> 
> **.env file must be placed in the `android/` directory!**

1. **Install Node.js 18+ and npm**
2. **Install Appium CLI and uiautomator2 driver:**
   ```sh
   npm install -g appium
   appium driver install uiautomator2
   ```
3. **Install Android platform-tools and set `PATH`/`ANDROID_HOME`**
4. **Enable USB debugging on your device and connect via USB**
5. **Copy and edit `.env` in `android/`**
   - See [Set Up Your .env File](#6-set-up-your-env-file) for details.
6. **Start Appium in a separate terminal:**
   ```sh
   appium
   ```
7. **In another terminal:**
   ```sh
   cd sefaria-app-tests/android
   npm install
   npm test
   ```

> For BrowserStack: set credentials and app ID in `.env`, upload your app **every time you build a new APK/AAB**, and set `RUN_ENV=browserstack`. **Update the App ID in `.env` after each upload.**

---

## Prerequisites

### 1. **Node.js**

- Install Node.js (recommended version: `18.x` or newer).
- Download from [Node.js official website](https://nodejs.org/).
- **After installing Node.js, npm is included automatically.**
- **Restart your terminal after installing Node.js.**
- Verify installation:

  ```sh
  node -v
  npm -v
  ```

### 2. **Appium**

- This project uses the Appium CLI (not Appium Desktop). You only need the CLI.
- Install Appium globally for local testing:

  ```sh
  npm install -g appium
  ```

- **If `appium` is not recognized after install, restart your terminal.**
- **Check Appium is installed:**

  ```sh
  appium -v
  ```

- **Install the uiautomator2 driver** (required for Android automation):
  
  ```sh
  appium driver install uiautomator2
  ```

- **Important:**  
  Always start the Appium server in a **separate terminal window** before running your tests:

  ```sh
  appium
  ```

  Leave this terminal open and run your tests in a different terminal.

### 3. **Android SDK & Platform-Tools**

> **Note:** You do **not** need to install the full Android SDK if you already have `platform-tools` and `adb` working. You can set up your environment with just platform-tools for most use cases.

You have **two options** for setting up the required Android tools:

#### Option 1: Download Android Studio (includes full SDK and platform-tools)

- Download and install [Android Studio](https://developer.android.com/studio) (includes SDK Manager).
- In Android Studio, open the SDK Manager and ensure "Android SDK Platform-Tools" is installed.

#### Option 2: Download only platform-tools (minimal install, recommended for most users)

- Download [platform-tools only](https://developer.android.com/studio#command-line-tools-only). (download the SDK Platform Tools for your OS)
- Extract the zip and note the path to the `platform-tools` directory.

---

**After installing either option, you must add platform-tools to your PATH and set ANDROID_HOME:**

- **Add platform-tools to your PATH:**
  - Find the `platform-tools` directory (e.g., `C:/Users/YOURNAME/AppData/Local/Android/Sdk/platform-tools` on Windows, `/Users/yourname/Library/Android/sdk/platform-tools` on Mac).
  - On Windows:
    1. Search for "Environment Variables" in the Start menu.
    2. Edit the `Path` variable in your user or system variables.
    3. Add the full path to your `platform-tools` directory (no quotes, no trailing spaces).
    4. Click OK and restart your terminal.
  - On Mac/Linux, add to your `.bashrc` or `.zshrc`:

    ```sh
    export PATH=$PATH:/path/to/platform-tools
    ```

- **Set ANDROID_HOME environment variable:**
  - On Windows:
    1. In "Environment Variables", click "New" under user or system variables.
    2. Set the variable name to `ANDROID_HOME`.
    3. Set the value to the path of your Android SDK root (e.g., `C:/Users/YOURNAME/AppData/Local/Android/Sdk`) **or** directly to your `platform-tools` directory (e.g., `C:/Users/YOURNAME/AppData/Local/Android/Sdk/platform-tools`).
    4. Click OK and restart your terminal.
  - On Mac/Linux, add to your `.bashrc` or `.zshrc`:

    ```sh
    export ANDROID_HOME=/path/to/Android/Sdk # or /path/to/platform-tools
    export PATH=$PATH:$ANDROID_HOME/platform-tools
    ```

- **Check adb is installed:**

  ```sh
  adb version
  ```

### 4. **Enable USB Debugging on Android**

- On your Android device:
  1. Go to Settings > About phone > Tap "Build number" 7 times to enable Developer Options.
  2. Go to Settings > Developer Options > Enable "USB debugging".
- Connect your device via USB.

### 5. **Get Your Device ID**

- Open a terminal and run:

  ```sh
  adb devices
  ```

- You should see a list of connected devices. Copy the device ID (the string before "device").

### 6. **Set Up Your `.env` File**

> **Note:** The `.env` file must be placed in the `android/` directory (not the project root).

- Copy `example.env` to `.env` in the `android` directory:

  ```sh
  cp example.env .env
  ```

- Edit `.env` and set:

  ```
  LOCAL_DEVICE_NAME=your_device_id_here
  LOCAL_APP_PATH=full_path_to_sefaria_app.apk
  ```
  Replace `your_device_id_here` with the value from `adb devices`.

  Set `LOCAL_APP_PATH` to the **full absolute path** to your `sefaria_app.apk` file:

  ```
  LOCAL_APP_PATH=C:/Users/yourname/path/to/sefaria_app.apk
  ```

---

## Running Tests Locally

> **Make sure you are inside the `sefaria-app-tests` directory before running any commands below.**

> **To see a clean overview of the testing logs, look inside the `android/logs-test/` directory.**

### 1. Connect to Your Device with Appium

- **Start Appium in a separate terminal window:**

  ```sh
  appium
  ```
  - Leave this terminal open while running tests.

- **Connect your device and verify:**

  ```sh
  adb devices
  ```
  - Your device should be listed as "device".

### 2. Run the Tests

- **Navigate to the android directory:**

  ```sh
  cd android
  ```

- **Install dependencies:**

  ```sh
  npm install
  ```

- **Run the tests (in a new terminal window):**

  ```sh
  npm test
  ```

---

## Running Tests on BrowserStack

To run tests on BrowserStack:

1. **Update your `.env` file with your BrowserStack credentials and app ID:**
   - Set the following values in your `.env` file:

     ```
     BROWSERSTACK_USERNAME=your_browserstack_username
     BROWSERSTACK_ACCESS_KEY=your_browserstack_access_key
     BROWSERSTACK_APP_ID=bs://your_browserstack_app_id
     RUN_ENV=browserstack
     ```

   - You can find your credentials and app ID in your [BrowserStack dashboard](https://www.browserstack.com/).
   - **Upload your app to BrowserStack** using their [App Upload page](https://app-automate.browserstack.com/dashboard/v2/app-upload) and copy the App ID.
   - **Important:** You must upload your app **every time you build a new APK or AAB**. The App ID changes with each upload, so always update `BROWSERSTACK_APP_ID` in your `.env` after uploading a new build.

2. **Run the tests:**

   ```sh
   npm test
   ```

---

## Running Tests with GitHub Actions (CI)

You can run the automated tests on BrowserStack using GitHub Actions. 

### How to Manually Trigger the "Run BrowserStack" Workflow

1. **Push Your Changes (if needed):**
   - Make sure your branch is pushed to GitHub. The workflow will run against the latest commit on the selected branch.

2. **Open the Actions Tab:**
   - Go to your repository on GitHub (e.g., `https://github.com/Sefaria/Sefaria-Mobile.git`).
   - Click the **Actions** tab at the top of the page.

3. **Find the "Run BrowserStack" Workflow:**
   - In the left sidebar, look for the workflow named **Run BrowserStack**.
   - Click on it to open the workflow page.

4. **Trigger the Workflow Manually:**
   - Click the **Run workflow** button (usually on the right side of the workflow page).
   - Select the branch you want to test (e.g., `main` or your feature branch).
   - Click the green **Run workflow** button to start the job.

5. **Monitor the Workflow:**
   - The workflow will appear in the list below. Click on the latest run to view detailed progress and logs.
   - You can expand each job step to see real-time output and any errors.

6. **Download Test Logs and Artifacts:**
   - When the workflow finishes, scroll to the bottom of the run summary page.
   - Download the `test-run.log` or any other artifacts provided for detailed results.

7. **Troubleshooting Failed Runs:**
   - If the workflow fails, expand the failed step to read the error message.
   - Common issues include missing or incorrect BrowserStack credentials, app upload problems, or test failures.
   - Double-check that all required GitHub Secrets are present in your repository settings (e.g., `BROWSERSTACK_USERNAME`, `BROWSERSTACK_ACCESS_KEY`).
   - For more help, see the [Troubleshooting](#troubleshooting) section or contact the team (see [Getting Help](#getting-help)).

**Note:**

- The workflow uses environment variables saved in GitHub Secrets, not your local `.env` file. Make sure all required secrets are set in your repository before triggering the workflow.
- You must have write access to the repository to manually trigger workflows.
- If you do not see the "Run workflow" button, make sure you are logged in and have the correct permissions.

---

## Test Logs

- **All console output and errors are saved to:**
  - `android/logs-test/*`
  - As a test-run file with current date and time
  - Example log file name:** `test-run-2023-10-01T12-00-00.log`
- **Certain failed actions in UI are saved to:**
  - `android/diff-images/*`
  - These images show the screenshot of page, and the view it was trying to perform an action on.
- **In GitHub Actions:**
  - This log file is uploaded as an artifact and can be downloaded from the Actions run summary page.

---

## Cleaning Up Test Logs and Screenshots

- To quickly remove all test logs in `logs-test` and all screenshots in `diff-images`, run:
  ```sh
  npm run cleanup
  ```
- To clean up and immediately run the tests in one step, use:
  ```sh
  npm run test:clean
  ```
This helps keep your workspace tidy and ensures you only see logs and screenshots from your latest test run.

---

## Troubleshooting

- **Device not found:**  
  - Make sure USB debugging is enabled and the device is connected.
  - Try a different USB cable or port.
  - Run `adb kill-server && adb start-server` to restart the adb server.
  - If you see errors about missing devices or "device not found," double-check that your device is listed by `adb devices` and that the ID matches your `.env` file.
  - Sometimes you have to close the terminal and try again.

- **Device shows as 'unauthorized' in `adb devices`:**
  - Disconnect and reconnect your phone.
  - On your phone, check for a prompt to allow USB debugging and accept it.
  - If not prompted, try toggling USB debugging off and on again in Developer Options.
  - If still not working, revoke USB debugging authorizations in Developer Options, then reconnect and accept the prompt.

- **Appium not running:**  
  - Start Appium in a separate terminal with `appium`.

- **platform-tools or ANDROID_HOME not in PATH:**  
  - Double-check your environment variable settings and restart your terminal.
  - Make sure both `platform-tools` is in your `PATH` and `ANDROID_HOME` is set.

- **uiautomator2 driver not installed:**  
  - Run `appium driver install uiautomator2`.

- **BrowserStack issues:**
  - Make sure your credentials and app ID are correct in the `.env` file.
  - The app must be uploaded to BrowserStack.

- **Windows: Script execution policy blocks running tests:**
  - If you see an error about scripts being disabled, open PowerShell as Administrator and run:
    ```powershell
    Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
    ```
  - Accept the prompt. Then try running your tests again.

- **Test hangs:**
  - If tests hang, restart your emulator/device and Appium server.

- **Running a single test:**
  - Use `.only` in your test file (e.g., `it.only(...)`).

- **npm/appium issues:**
  - If `npm install` fails, try `npm cache clean --force` and run again.
  - If `appium` is not recognized, restart your terminal or add npm global bin to your PATH.

- **Running as Administrator (Windows):**
  - Right-click Command Prompt or PowerShell and select "Run as administrator".

- **Installing Git:**
  - Download it from [git-scm.com](https://git-scm.com/downloads).

---

## Example `.env` File

```properties
# BrowserStack Credentials (if using BrowserStack)
BROWSERSTACK_USERNAME=your_browserstack_username
BROWSERSTACK_ACCESS_KEY=your_browserstack_access_key
BROWSERSTACK_APP_ID=bs://your_browserstack_app_id

# Local Testing Configuration
LOCAL_DEVICE_NAME=your_device_id_here
LOCAL_APP_PATH=path_to_your_apk_or_aab_file

# Test Environment
RUN_ENV=local # Use 'browserstack' for BrowserStack testing
```

---

## Notes

- **Node.js version:** Node.js 18 or newer is required for all features to work.
- **Path formatting:**
  - On **Windows**: Use `/` or double backslashes (`\\`) in `.env` paths.
  - On **Mac/Linux**: Use `/` in paths.
- **BrowserStack:**
  - After uploading a new app build, update `BROWSERSTACK_APP_ID` in your `.env`.
  - Requires a (free or paid) account; free accounts may have limitations.

---

## Getting Help

If you get stuck or have questions, please reach out:

- **GitHub Issues:** [github.com/sefaria/Sefaria-Mobile](hhttps://github.com/Sefaria/Sefaria-Mobile.git)
- **Sefaria Dev Contact Page:** [Sefaria Developer Portal](https://developers.sefaria.org/page/contact-us)
- **Slack:** #sefaria-team (if you have access)
- **General troubleshooting:** See the [Troubleshooting](#troubleshooting) section above.

---

## Using Appium Inspector

**Tip:**  
To inspect your mobile app and find element selectors for writing tests, download [Appium Inspector](https://github.com/appium/appium-inspector/releases). This tool lets you connect to your device and visually explore the app’s UI hierarchy.

When connecting Appium Inspector to your device, use the following JSON configuration (replace `DEVICE_ID` and `APK_PATH` with your actual values):

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

This configuration will allow Appium Inspector to launch the Sefaria app and let you explore its UI elements for test development.

> **Tip:** If Appium cannot find `apksigner.jar` and is searching in `platform-tools`, look for it in `build-tools/<version>` directory, copy it and move it to `platform-tools`.

> **Note:** If you want to use Appium Inspector, you must have the Java JDK installed and the `JAVA_HOME` environment variable set.  
> Download the JDK from [Adoptium](https://adoptium.net/), install it, and set `JAVA_HOME` (If not automatically added) to your JDK path.  
> Restart your terminal after making changes.