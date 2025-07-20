# Sefaria Mobile - Automatic E2E Testing

This directory contains the **automated end-to-end (E2E) testing framework** for the Sefaria Mobile app.  
It is designed to help contributors and maintainers write, run, and maintain robust UI tests for the Sefaria app (Android only, IOS pending) using Appium and WebdriverIO.

---

## What is This?

- **Purpose:**  
  To automate user flows and UI validation for the Sefaria Mobile app, ensuring quality and catching regressions before release.
- **Tech Stack:**  
  - [Appium](https://appium.io/) for device automation  
  - [WebdriverIO](https://webdriver.io/) for test orchestration  
  - TypeScript for type safety and maintainability

---

> **Note:** You do **not** need to have the Sefaria-Mobile project running or a local development server active to run these tests.  
> The test framework installs and launches the app APK/AAB directly on your device or emulator.

## Quick Links

- [Setup & Environment Guide](./SETUP.md)  
  _How to install dependencies, configure your device, and run tests locally or on CI._
- [Test Authoring Guide](./TEST_GUIDE.md)  
  _How to write new tests, create reusable components, and add utility functions. Includes best practices and code examples._
- [File & Folder Overview](./FILE_OVERVIEW.md)  
  _A summary of the main files and folders in this directory and their roles._
  
  **How to Use This Overview:**  
  
  - **New contributors:** Start here to understand where to add new helpers or tests.  

  - **Maintainers:** Use this to keep the codebase organized and avoid duplication. 

  - **For detailed usage:** See the header comments in each file and the main project README.

---

## Basic Commands

- **Run all tests:**

  ```sh
  npm test
  ```

- **Clean up logs/screenshots:**

  ```sh
  npm run cleanup
  ```

- **Clean and run tests:**

  ```sh
  npm run test:clean
  ```

## Test Execution Modes

- **Local:** Run tests on your own Android device or emulator using Appium. Fast for development and debugging.
- **Cloud/CI:** Run tests on real devices in the cloud via BrowserStack and GitHub Actions. Good for cross-device/OS validation and CI. **Note:** You must manually upload each new APK/AAB build to BrowserStack and update the App ID in `.env` before running tests in CI.

---

## Help & Support

- **GitHub Issues:** [Sefaria-Mobile](https://github.com/Sefaria/Sefaria-Mobile.git)

- **Contact:** [Sefaria Developer Portal](https://developers.sefaria.org/page/contact-us)

- **Troubleshooting:**  
  See the [Troubleshooting](./SETUP.md#troubleshooting) section in the setup guide for common issues and solutions. 
