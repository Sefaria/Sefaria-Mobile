# Sefaria Android Testing Framework - File Overview

This document describes the purpose and main usage of each file and folder in the `android/testing-framework` directory.  
Use this as a quick reference for contributors and maintainers.

---

## components/

Reusable page/component objects for high-level UI actions.

> **Note:** The files in this directory follow the Page Object Model (POM) pattern, where each file represents a specific page or component of the app.

- **display_settings.ts**  
  Helpers for toggling display settings and language in the app. Uses centralized selectors and timeouts for consistent element interaction.

- **navbar.ts**  
  Functions to interact with the navigation bar (click 'Search' on navigation bar). Improved with navigation-specific selectors and operation timeouts.

- **reader_page.ts**  
  Utilities for validating titles and text on the reader page (e.g Genesis 1.1). Functions renamed for clarity: `verifyExactTitle`, `verifyTitleContains`, `findTextByAccessibilityId`.

- **search_page.ts**  
  Helpers for typing into the search bar and selecting from search results. Uses base selectors and operation timeouts for reliable search interactions.

- **topics_page.ts**  
  Functions for navigating and validating the Topics page, including clicking specific topics and verifying content of sheets and sources. Functions renamed for clarity: `verifyTopicTitle`, `verifyTopicCategory`, `verifyTopicBlurb`, `navigateBackFromTopic`, `openSourceMenu`.

- **\*.ts**  
  Other component helpers for specific pages or features can be added in the future as needed. For example, you might add `account_page.ts` for account-related actions.

---

## constants/

Centralized constants for selectors, timeouts, gestures, colors, errors, and text.

> **Note:** All hardcoded values have been centralized into organized constant files for better maintainability and consistency across the testing framework.

- **selectors.ts**  
  UI selector patterns, content descriptions, and element selectors organized by component type (navigation, reader, topics, etc.).

- **timeouts.ts**  
  All timeout values organized by operation type: element waiting, test execution, BrowserStack sessions, and specific UI interactions.

- **gestures.ts**  
  Gesture configuration including swipe distances, timing, touch actions, and screen position calculations for consistent user interaction simulation.

- **colors.ts**  
  Sefaria brand colors, color tolerance thresholds for pixel comparison testing, and UI component color mappings.

- **errors.ts**  
  Error message templates and logging helpers for assertions and failures.

- **text_constants.ts**  
  Text snippets, Hebrew months, and other static text used in tests.

- **index.ts**  
  Central import point for all constants with convenient namespace-style exports.

- **\*.ts**
  Additional constants can be added as needed for specific tests or components.

---

## tests/

Where your actual test suites live.

- **e2e.spec.ts**  
Main end-to-end regression test suite. Handles the regression flow of the app as designed by QA.

- **test_init.ts** (Do not edit)  
  Initializes logging and error handling for writing logs to `logs-test/`.

- **\*.spec.ts**
  Additional test files can be created for specific features or components.  
  Each file should follow the same structure as `e2e.spec.ts` with `beforeEach`, `afterEach`, and `it` blocks.

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
  Loads environment variables and credentials from `.env`.  
  Provides Appium/WebdriverIO the information for local and BrowserStack sessions. Enhanced with proper environment variable handling.

- **offlinePopUp.ts**  
  Detects and interacts with the initial offline popup in the app (e.g., "Not Now", "OK" buttons). Uses centralized selectors for consistent popup element detection.

- **sefariaAPI.ts**  
  Fetches and caches data from the Sefaria API (calendar, Daf Yomi, Haftarah, etc.). Includes enhanced error handling and response validation.

- **text_finder.ts**  
  Locates and interacts with text and elements by text or content-desc.  
  Includes strict and substring matching, header checks, and content-desc utilities.

- **ui_checker.ts**  
  Checks pixel colors of UI elements and viewgroups.  
  Includes screenshot cropping, color comparison, and debug image saving for visual regression/UI validation.

- **\*.ts**
  Additional utility functions can be added as needed for specific tasks or features.

---

_Last updated: July 2025_

---

[⬅ README](./README.md)
