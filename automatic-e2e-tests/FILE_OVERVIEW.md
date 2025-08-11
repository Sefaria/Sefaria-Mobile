# Sefaria Mobile Testing Framework - File Overview

This document describes the purpose and main usage of each file and folder in the E2E test directory.  
Use this as a quick reference for contributors and maintainers.

---

## Directory Structure

- **Selectors/**  
  Contains platform-specific selectors for Android and iOS.  
  - **selectors/android/selectors.ts**  
    Android-specific UI selectors and XPath patterns.
  - **selectors/ios/selectors.ts**  
    iOS-specific UI selectors and XPath patterns.

- **logs/** and **screenshots/**  
  Centralized logs and screenshots for both platforms.

- **scripts/**  
  Utility scripts (e.g., cleanup.js). `run-parallel-tests.js` for running tests in parallel on multiple devices.

- **devices.json**  
  Configuration file for devices used in parallel testing. Set specific devices and version for Android and iOS.

---

## components/

> **Note:** The files in this directory follow the Page Object Model (POM) pattern, where each file represents a specific page or component of the app.

Reusable page/component objects for high-level UI actions (cross-platform).

- **display_settings.ts**  
  Helpers for toggling display settings and language.

- **navbar.ts**  
  Functions to interact with the navigation bar.

- **reader_page.ts**  
  Utilities for validating titles and text on the reader page.

- **search_page.ts**  
  Helpers for typing into the search bar and selecting from search results.

- **topics_page.ts**  
  Functions for navigating and validating the Topics page.

- **index.ts**  
  Central import point for all components, allowing easy access to all page objects.

- **\*.ts**  
  Add new component helpers as needed.

---

## constants/

Centralized constants for timeouts, gestures, colors, errors, and text.

- **timeouts.ts**  
  All timeout values organized by operation type.

- **gestures.ts**  
  Gesture configuration for swipes, scrolls, etc. Used for user interaction simulations.

- **colors.ts**  
  Sefaria brand colors and color thresholds.

- **errors.ts**  
  Error message templates and logging helpers.

- **text_constants.ts**  
  Text snippets, Hebrew months, and other static text.

- **index.ts**  
  Central import point for all constants, with dynamic platform selector loading.
  This file **automatically loads the correct selectors** at runtime based on the current platform (Android or iOS), so you can always import `SELECTORS` from `constants` and it will "just work".

---

## tests/

Where your actual test suites live.

- **e2e.spec.ts**  
  Main end-to-end regression test suite.

- **\*.spec.ts**  
  Add new test files for specific features or components.

---

## utils/

Helper modules for low-level actions, API calls, and cross-cutting concerns.

- **browserstack_report.ts**  
  Helpers for interacting with the BrowserStack session API (set session status, report results).

- **gesture.ts**  
  Gesture and scrolling utilities: swipe, scroll, and element search with screen dimension caching.

- **helper_functions.ts**  
  General-purpose helpers: text escaping, color conversion, date formatting, and assertion helpers.

- **load_credentials.ts**  
  Loads environment variables and credentials from `.env` file in the root directory of `automatic-e2e-tests/`.

- **offlinePopUp.ts**  
  Handles the initial offline popup in the app.

- **sefariaAPI.ts**  
  Fetches and caches data from the Sefaria API.

- **text_finder.ts**  
  Locates and interacts with text and elements by text or content-desc, and more. **Important:** Used all across tests and functions.

- **ui_checker.ts**  
  Checks pixel colors of UI elements and viewgroups.

- **index.ts**  
  Central import point for all utilities.

- **\*.ts**  
  Add new utility functions as needed.

---

_Last updated: July 2025_

---

[⬅ README](./README.md)