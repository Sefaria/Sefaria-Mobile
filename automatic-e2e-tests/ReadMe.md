# Sefaria Mobile - Automatic E2E Testing

This directory contains the **automated end-to-end (E2E) testing framework** for the Sefaria Mobile app.  
It is designed to help contributors and maintainers write, run, and maintain robust UI tests for the Sefaria app on **Android and iOS** using Appium and WebdriverIO.

---

## What is This?

- **Purpose:**  
  To automate user flows and UI validation for the Sefaria Mobile app, ensuring quality and catching regressions before release.
- **Tech Stack:**  
  - [Appium](https://appium.io/) for device automation  
  - [WebdriverIO](https://webdriver.io/) for test orchestration  
  - TypeScript for type safety and maintainability

---

> **Note:**  
>You do **not** need to have the Sefaria-Mobile project running or a local development server active to run these tests.  
> The test framework installs and launches the app APK/AAB (Android) or IPA (iOS) directly on your device, emulator, or cloud device.

> **Important:**  
> You only need to download or clone the `automatic-e2e-tests` directory.  
> **You do NOT need the full Sefaria-Mobile application source code** to run or write tests.  
> This test framework is fully self-contained and works with APK/AAB (Android) or IPA (iOS) app builds.


## Quick Links

- [Setup & Environment Guide](./SETUP.md)  
  _How to install dependencies, configure your device, and run tests locally or on CI._
- [Test Authoring Guide](./TEST_GUIDE.md)  
  _How to write new tests, create reusable components, and add utility functions. Includes best practices and code examples._
- [File & Folder Overview](./FILE_OVERVIEW.md)  
  _A summary of the main files and folders in this directory and their roles._

---

## Basic Commands

- **Run all tests (Android local):**
  ```sh
  npm run test:android:local
  ```
- **Run all tests (iOS local):**
  ```sh
  npm run test:ios:local
  ```
- **Run all tests (Android BrowserStack):**
  ```sh
  npm run test:android:browserstack
  ```
- **Run all tests (iOS BrowserStack):**
  ```sh
  npm run test:ios:browserstack
  ```
- **Run tests in parallel on multiple devices:** (set devices in `devices.json`)
  ```sh
  npm run test:android:parallel
  npm run test:ios:parallel
  ```

- **Clean up logs/screenshots:**
  ```sh
  npm run cleanup
  npm run cleanup:android
  npm run cleanup:ios
  ```

## Test Execution Modes

- **Local:** Run tests on your own Android/iOS device or emulator using Appium. Fast for development and debugging.
- **Cloud/CI:** Run tests on real devices in the cloud via BrowserStack and GitHub Actions. Good for cross-device/OS validation and CI.  
  **Note:** You must manually upload each new APK/AAB/IPA build to BrowserStack and update the App ID in `.env` before running tests in CI.

---

## Help & Support

- **GitHub Issues:** [Sefaria-Mobile](https://github.com/Sefaria/Sefaria-Mobile/issues)
- **Contact:** [Sefaria Developer Portal](https://developers.sefaria.org/page/contact-us)
- **Troubleshooting:**  
  See the [Troubleshooting](./SETUP.md#troubleshooting) section in the setup guide for common issues and solutions.