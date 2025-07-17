# Sefaria Android Testing Framework - File Overview

This document describes the purpose and main usage of each file and folder in the `android/testing-framework` directory.  
Use this as a quick reference for contributors and maintainers.

---

## 📁 components/

Reusable page/component objects for high-level UI actions.

- **display_settings.ts**  
  Helpers for toggling display settings and language in the app.

- **navbar.ts**  
  Functions to interact with the navigation bar (wait for, click items, close popups).

- **reader_page.ts**  
  Utilities for validating titles and text on the main reader page.

- **search_page.ts**  
  Helpers for typing into the search bar and selecting from search results.

- **topics_page.ts**  
  Functions for navigating and validating the Topics page, including clicking tabs and verifying content.

- **\*.ts**  
  Other component helpers for specific pages or features (such as the Account tab) can be added in the future as needed. For example, you might add `account_page.ts` for account-related actions.

---

## 📁 constants/

Centralized error and text constants for consistency.

- **error_constants.ts**  
  Error message templates and logging helpers for assertions and failures.

- **text_constants.ts**  
  Text snippets, Hebrew months, and other static text used in tests.

- **\*.ts**
  Additional constants can be added as needed for specific tests or components.

---

## 📁 tests/

Where your actual test suites live.

- **e2e.spec.ts**  
  Main end-to-end test suite. Handles logging, session setup/teardown, and contains all test cases.

- **test_init.ts**  
  Initializes logging and error handling for writing logs to `logs-test/`.

- **\*.spec.ts**
  Additional test files can be created for specific features or components.  
  Each file should follow the same structure as `e2e.spec.ts` with `beforeEach`, `afterEach`, and `it` blocks.

---

## 📁 utils/

Helper modules for low-level actions, API calls, and cross-cutting concerns.

- **browserstackUtils.ts**  
  Helpers for interacting with the BrowserStack session API (set session status, report results).

- **gesture.ts**  
  Gesture and scrolling utilities: swipe, scroll, and element search with screen dimension caching.

- **helper_functions.ts**  
  General-purpose helpers: text escaping, color conversion, date formatting, and assertion helpers.

- **load_credentials.ts**  
  Loads environment variables and credentials from `.env`.  
  Provides Appium/WebdriverIO options for local and BrowserStack sessions.

- **offlinePopUp.ts**  
  Detects and interacts with offline popups in the app (e.g., "Not Now", "OK" buttons).

- **sefariaAPI.ts**  
  Fetches and caches data from the Sefaria API (calendar, Daf Yomi, Haftarah, etc.).

- **text_finder.ts**  
  Locates and interacts with text and elements by text or content-desc.  
  Includes strict and substring matching, header checks, and content-desc utilities.

- **ui_checker.ts**  
  Checks pixel colors of UI elements and viewgroups.  
  Includes screenshot cropping, color comparison, and debug image saving for visual regression/UI validation.

- **\*.ts**
  Additional utility functions can be added as needed for specific tasks or features.
---

## How to Use This Overview

- **New contributors:** Start here to understand where to add new helpers or tests.
- **Maintainers:** Use this to keep the codebase organized and avoid duplication.
- **For detailed usage:** See the header comments in each file and the main project README.

---

_Last updated: July 2025_