# Sefaria App Automated Testing – Guide to Writing Cross-Platform Tests, Components, and Utilities

This document explains **how to write new tests**, **create reusable components**, and **add utility functions** for the Sefaria Mobile automated testing framework.  
It is intended for both new contributors and experienced maintainers, and covers both **Android and iOS**.

---

## Table of Contents

- [General Principles](#general-principles)
- [Using Constants & Selectors](#using-constants--selectors)
- [Test File Structure & Best Practices](#test-file-structure--best-practices)
- [How to Write a New Test](#how-to-write-a-new-test)
- [How to Create a Component](#how-to-create-a-component)
- [How to Add a Utility Function](#how-to-add-a-utility-function)
- [Common Patterns & Examples](#common-patterns--examples)
- [Debugging & Troubleshooting](#debugging--troubleshooting)

---

## General Principles

- **Write cross-platform tests:** All helpers and tests should work for both Android and iOS unless a platform-specific workaround is required.
- **Use all imports:** If you import a function or constant, make sure it is actually used.
- **Keep tests independent:** Each test should set up its own state and not depend on previous tests.
- **Use page/component helpers:** Place actions that are specific to a particular page in `components/` files.
- **Use utility functions:** Place cross-cutting helpers in `utils/`.
- **Keep tests clean:** Do not use selectors or log statements directly in your test files.
- **Log clearly:** Use `console.log`, `console.debug` for important steps and always log errors (inside helpers).
- **Fail fast:** Throw errors as soon as a check fails, with clear messages.
- **Prefer selectors by content-desc or text:** Avoid brittle index-based selectors when possible.
- **Always use `await`** when calling asynchronous helper functions.

---

## Using Constants & Selectors

The framework uses a **centralized constants architecture** for selectors, timeouts, gestures, colors, errors, and text.  
All constants are organized in `shared/constants/` and imported from a single index file.

### Platform-Specific Selectors

- Android selectors: [`android/selectors/selectors.ts`](../android/selectors/selectors.ts)
- iOS selectors: [`ios/selectors/selectors.ts`](../ios/selectors/selectors.ts)
- The shared [`constants/index.ts`](../shared/constants/index.ts) **automatically loads the correct selectors** at runtime based on the current platform (`PLATFORM` env var).

**When adding a new selector:**  
- **Always add the selector to both `android/selectors/selectors.ts` and `ios/selectors/selectors.ts` using the exact same property name.**
- This ensures that your helpers and tests will work seamlessly on both platforms, since `SELECTORS` will always provide the correct value for the current platform.
- If a selector is not relevant for one platform, add a placeholder or comment for clarity.

**Example: Adding a new selector**

```typescript
// android/selectors/selectors.ts
export const NAVBAR_SELECTORS = {
  navItems: {
    account: '//*[@content-desc="Account"]',
    topics: '//*[@content-desc="Topics"]',
    bookmarks: '//*[@content-desc="Bookmarks"]', // New selector
  }
  // ...other selectors
};

// ios/selectors/selectors.ts
export const NAVBAR_SELECTORS = {
  navItems: {
    account: '//XCUIElementTypeButton[@name="Account"]',
    topics: '//XCUIElementTypeButton[@name="Topics"]',
    bookmarks: '//XCUIElementTypeButton[@name="Bookmarks"]', // New selector, same property name
  }
  // ...other selectors
};
```

### How to Import Constants

```typescript
import { SELECTORS, OPERATION_TIMEOUTS, SEFARIA_COLORS } from '../constants';
```

---

## Test File Structure & Best Practices

- All test files live in [`shared/tests/`](./shared/tests).
- Use `describe` blocks for grouping related tests.
- Use `beforeEach`/`afterEach` for setup and teardown.
- Use helpers from `components/` and `utils/` for all repetitive actions (e.g., navigation, gestures).
- Log the start and end of each test for traceability.
- Save logs and screenshots for failed tests (handled automatically).
- **Tests should not reference platform-specific selectors directly**—always use helpers and constants.

**Example Test Skeleton:**

```typescript
import { remote } from 'webdriverio';
import { NAVBAR } from '../components/navbar';
import { BROWSERSTACK_REPORT, OFFLINE_POPUP, LOAD_CREDENTIALS, TEXT_FINDER } from '../utils';
import { TEST_TIMEOUTS, SELECTORS } from '../constants';

import './test_init';

const no_reset = false;
const buildName = `Sefaria E2E ${process.env.PLATFORM?.toUpperCase()}: ${new Date().toISOString().slice(0, 10)}`;

describe('e2e Sefaria Mobile regression tests', function () {
  this.timeout(TEST_TIMEOUTS.SINGLE_TEST);
  let client: WebdriverIO.Browser;
  let testTitle: string;

  beforeEach(async function () {
    testTitle = this.currentTest?.title || '';
    console.log(`[INFO] (STARTING) Running test: ${testTitle}`);
    client = await remote(LOAD_CREDENTIALS.getOpts(buildName, testTitle, no_reset));
    await OFFLINE_POPUP.handleOfflinePopUp(client);
    await NAVBAR.waitForNavBar(client);
  });

  afterEach(async function () {
    if (client) {
      if (process.env.RUN_ENV == 'browserstack') {
        await BROWSERSTACK_REPORT.reportToBrowserstack(client, this);
      }
      console.log(
        this.currentTest?.state === 'passed'
          ? `✅ (PASSED); Finished test: ${testTitle}\n`
          : `❌ (FAILED); Finished test: ${testTitle}\n`
      );
      await client.deleteSession();
    }
  });

  it('Navigate to Account tab and verify we are there', async function () {
    await NAVBAR.clickNavBarItem(client, SELECTORS.NAVBAR_SELECTORS.navItems.account);
    await TEXT_FINDER.verifyHeaderOnPage(client, 'Account');
  });
});
```

---

## How to Write a New Test

> **Tip:** Use `.only` to run a single test (`it.only`) or describe block for debugging.

1. **Add regression tests in `e2e.spec.ts`** or create a new test in a new file in `shared/tests/`.
2. **Decide what you want to test.**
3. **Use or create a component helper** for actions related to specific pages or features.
4. **Use utility functions** for gestures, color checks, text finding, or other non-page specific actions.
5. **Structure:**
   - Use `beforeEach` to set up the app state.
   - Use `afterEach` to clean up.
   - Use `it` blocks for each scenario.
6. **Keep your test code clean:** Only call helper functions.
7. **Log important steps** and always log errors.
8. **Remove .only** before committing your test file.
9. **Tests should work for both Android and iOS**—avoid platform-specific logic in test files.

**Example:**

```typescript
import {NAVBAR} from '../components';
import {TEXT_FINDER} from '../utils';
it('should open the Topics tab and verify the header', async function () {
  await NAVBAR.clickNavBarItem(client, SELECTORS.NAVBAR_SELECTORS.navItems.topics);
  await TEXT_FINDER.verifyHeaderOnPage(client, 'Explore by Topic');
});
```

---

## How to Create a Component

- Components live in [`shared/components/`](./shared/components/).
- Each file represents a page or feature and exports functions for interacting with it.
- Use clear, descriptive function names (e.g., `verifyTopicTitle`, `navigateBackFromTopic`).
- **Import constants** from the centralized constants directory.
- Document each function with JSDoc comments.
- Use robust selectors (prefer content-desc or text over index).
- **Write helpers to be cross-platform**—use `SELECTORS` and avoid platform checks in test files.

**Example: `components/display_settings.ts`**

```typescript
import { SELECTORS } from '../constants';

/**
 * Switches the app language to Hebrew.
 */
export async function switchToHebrew(client: Browser): Promise<void> {
  const langButton = await client.$(SELECTORS.DISPLAY_SETTINGS.languageButton);
  await langButton.waitForDisplayed();
  await langButton.click();
}
```

---

## How to Add a Utility Function

- Utilities live in [`shared/utils/`](./shared/utils/).
- Add new helpers for gestures, color checks, API calls, etc.
- Keep functions generic and reusable.
- **Import constants** from the centralized constants directory.
- Use improved function names.
- Document each function with JSDoc comments.
- **Write utilities to be cross-platform**—use constants and selectors from `SELECTORS`.

**Example: `utils/helper_functions.ts`**

```typescript
import { ELEMENT_TIMEOUTS } from '../constants';

/**
 * Waits for an element to be visible and returns it.
 */
export async function waitForVisible(client: Browser, selector: string): Promise<WebdriverIO.Element> {
  const elem = await client.$(selector);
  await elem.waitForDisplayed({ timeout: ELEMENT_TIMEOUTS.LONG_WAIT });
  return elem;
}
```

---

## Common Patterns & Examples

- **Find and click an element by text:**  
  ```typescript
  import { TEXT_FINDER } from '../utils';
  await (await TEXT_FINDER.findTextElement(client, 'Settings')).click();
  ```

- **Swipe to refresh a list:**  
  ```typescript
  import { GESTURE } from '../utils';
  await GESTURE.swipeDown(client, SELECTORS.LIST_VIEW);
  ```

- **Check for error message:**  
  ```typescript
  import { ERROR_MESSAGES } from '../constants';
  await TEXT_FINDER.findTextElement(client, ERROR_MESSAGES.NETWORK_ERROR);
  ```

- **Wait for a loading spinner to disappear:**  
  ```typescript
  await client.$(SELECTORS.SPINNER).waitForDisplayed({ reverse: true });
  ```

---

## Debugging & Troubleshooting

- **Logs:**  
  All console output is saved to `logs/` (`logs/android/`, `logs/ios/`).
- **Screenshots:**  
  Failed color checks save images to `screenshots/` (`screenshots/android/`, `screenshots/ios/`).
- **Uncaught errors:**  
  Are logged and will fail the test.
- **Flaky selectors:**  
  If a selector is unreliable, try to use content-desc or text instead of index.
- **Cannot read .ts extension:**  
  If you see this error, it usually means you have an unused import or variable in your test or helper file.

---

**Reminder:**  
- When adding a selector, always add it to both `android/selectors/selectors.ts` and `ios/selectors/selectors.ts` with the same property name.
- Always use helpers and constants for selectors—never hardcode them in tests.
- This ensures your tests are truly cross-platform and maintainable.

[⬅ README](./README.md)