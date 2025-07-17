# Sefaria Mobile - Automatic E2E Testing

This directory contains the **automated end-to-end (E2E) testing framework** for the Sefaria Mobile app.  
It is designed to help contributors and maintainers write, run, and maintain robust UI tests for the Sefaria app using Appium and WebdriverIO.

---

## What is This?

- **Purpose:**  
  To automate user flows and UI validation for the Sefaria Mobile app, ensuring quality and catching regressions before release.
- **Tech Stack:**  
  - [Appium](https://appium.io/) for device automation  
  - [WebdriverIO](https://webdriver.io/) for test orchestration  
  - TypeScript for type safety and maintainability

---

## Quick Links

- [Setup & Environment Guide](./SETUP.md)  
  _How to install dependencies, configure your device, and run tests locally or on CI._
- [Test Authoring Guide](./TEST_GUIDE.md)  
  _How to write new tests, create reusable components, and add utility functions. Includes best practices and code examples._
- [File & Folder Overview](./FILE_OVERVIEW.md)  
  _A summary of the main files and folders in this directory and their roles._

---

## Typical Workflow

1. **Set up your environment:**  
   Follow [SETUP.md](./SETUP.md) to install Node.js, Appium, Android SDK, and configure your `.env` file.
2. **Write or update tests:**  
   See [TEST_GUIDE.md](./TEST_GUIDE.md) for how to create new tests or helpers.
3. **Run tests locally or on CI:**  
   Use the provided npm scripts to run tests on your device, emulator, or BrowserStack.
4. **Check logs and debug:**  
   Test logs and screenshots are saved in `android/logs-test/` and `android/diff-images/`.

---

## Directory Structure

- `android/testing-framework/`  
  Main test framework:  
  - `components/` - Page/component object helpers  
  - `constants/` - Shared constants  
  - `tests/` - Test suites  
  - `utils/` - Utility functions
- `android/app/`  
  App binaries (APK/AAB) for testing
- `android/logs-test/`  
  Test run logs
- `android/diff-images/`  
  Screenshots for failed visual checks

---
