# Sefaria App Automated Testing - Guide to Writing Tests, Components, and Utilities

This document explains **how to write new tests**, **create reusable components**, and **add utility functions** for the Sefaria Android automated testing framework.  
It is intended for both new contributors and experienced maintainers.

---

## Table of Contents

- [General Principles](#general-principles)
- [Using Constants](#using-constants)
- [Test File Structure & Best Practices](#test-file-structure--best-practices)
- [How to Write a New Test](#how-to-write-a-new-test)
- [How to Create a Component](#how-to-create-a-component)
- [How to Add a Utility Function](#how-to-add-a-utility-function)
- [Common Patterns & Examples](#common-patterns--examples)
- [Debugging & Troubleshooting](#debugging--troubleshooting)

---

## Using Constants

The testing framework uses a centralized constants architecture to maintain consistency and reduce hardcoded values. All constants are organized in the `constants/` directory and can be imported from a single location.

### Constants Architecture

- **`constants/selectors.ts`**: UI selectors, XPath patterns, and element identifiers
- **`constants/timeouts.ts`**: Wait times, delays, and operation timeouts  
- **`constants/gestures.ts`**: Swipe distances, scroll configurations, and gesture parameters
- **`constants/colors.ts`**: Brand colors, thresholds, and UI color values
- **`constants/error_constants.ts`**: Standardized error messages and logging patterns
- **`constants/text_constants.ts`**: Static text, labels, and content strings
- **`constants/index.ts`**: Central export point for all constants

### How to Import Constants

Import constants from the centralized index file:

```javascript
import { 
  BASE_SELECTORS, 
  OPERATION_TIMEOUTS, 
  SWIPE_GESTURES,
  SEFARIA_COLORS 
} from '../constants';
```

### Best Practices for Constants

- **Always use constants** instead of hardcoded values
- **Import from the index file** for consistency
- **Add new constants** to the appropriate category file
- **Use descriptive names** that indicate purpose and context
- **Group related constants** in objects or namespaces

### Example Usage

```javascript
// Good: Using constants
import { BASE_SELECTORS, OPERATION_TIMEOUTS } from '../constants';

const element = await client.$(BASE_SELECTORS.NAVBAR_SEARCH);
await element.waitForDisplayed({ timeout: OPERATION_TIMEOUTS.ELEMENT_WAIT });

// Bad: Hardcoded values
const element = await client.$("//android.widget.TextView[@text='Search']");
await element.waitForDisplayed({ timeout: 4000 });
```

---

## General Principles

- **Use all imports:** If you import a function or constant, make sure it is actually used in your test or helper file. Unused imports may cause linter or build errors, and can clutter the codebase.
  - **Warning:** Unused imports will trigger warnings and make the log output messy. For example:

    ```javascript
    import { unusedFunction } from '../utils/helper_functions'; // This will cause a warning if not used
    ```

    > **Note:** Since we run tests with Mocha, you may see an error like `Cannot read .ts extension`. This is almost always caused by an unused import or variable in your test or helper file.
- **Keep tests independent:** Each test should set up its own state and not depend on previous tests.
- **Use page/component helpers:** Place actions that are specific to a particular page (e.g., Topics page navigation) in `components/` files. This keeps page-specific logic organized and reusable.
- **Use utility functions:** Place cross-cutting helpers (e.g., color checks, gestures, or repeated UI actions not related to a specific page) in `utils/`.
- **Keep tests clean:** Do not use selectors or log statements directly in your test files. All selectors and logging should be handled inside reusable functions in `components/` or `utils/`. This makes tests easier to read and maintain, and ensures consistent logging and selector usage across the project.
- **Log clearly:** Use `console.log` for important steps and always log errors (inside helpers).
  - **Use emojis** to indicate success ([DEBUG]) or failure (❌) in logs.
  - **check constants/error_constants.ts** for standardized error messages.
  - **Use logError() function** to log errors to the test-log file.
- **Fail fast:** Throw errors as soon as a check fails, with clear messages.
- **Prefer selectors by content-desc or text:** Avoid brittle index-based selectors when possible.
  - The tests can only see what is currently displayed on the screen, so if you use an index selector, it may not work if the UI changes.
- **Always use `await`** when calling asynchronous helper functions (most UI actions and checks are async). Omitting `await` can cause tests to pass or fail incorrectly, or lead to race conditions.

---

## Test File Structure & Best Practices

- All test files live in [`android/testing-framework/tests/`](./android/testing-framework/tests).
- Use `describe` blocks for grouping related tests.
- Use `beforeEach`/`afterEach` for setup and teardown.
- Use helpers from `components/` and `utils/` for all non-trivial actions.
- Log the start and end of each test for traceability.
- Save logs and screenshots for failed tests (handled automatically).

**Example Test Skeleton:**

```javascript
import { remote } from 'webdriverio';
import { getOpts } from '../utils/load_credentials';
import { waitForNavBar, clickNavBarItem } from '../components/navbar';
import { handleOfflinePopUp } from '../utils/offlinePopUp';
import { getCleanTestTitle } from '../utils/helper_functions';
import { findHeaderInFirstViewGroup } from '../utils/text_finder';
import { NAVBAR_SELECTORS } from '../constants/selectors';

// Required import: ensures logs are automatically written to the logs-test/ directory
import './test_init'; 

describe('Sefaria Mobile Regression Tests', function () {
  // Global test timeout for all tests in this block
  // This sets the maximum time each test can take before failing
  this.timeout(200000);
  let client: WebdriverIO.Browser;
  let testTitle: string;


  beforeEach(async function () {
    // Fetch the current test title
    testTitle = getCleanTestTitle(this);

    console.log(`[INFO] Running test: ${testTitle}`);

    // The client is the WebdriverIO browser instance used to interact with the app
    client = await remote(getOpts(buildName, testTitle, no_reset));

    // If offline pop-up appears, click Not Now and Ok
    await handleOfflinePopUp(client);
    // Navigation bar being present signals the app is ready
    await waitForNavBar(client);
  });

  afterEach(async function () {
    if (process.env.RUN_ENV == 'browserstack') {
      // If running on BrowserStack, set the session status (e.g., passed or failed)
      reportToBrowserstack(client, this);
    }
    console.log(`🎉 Finished test: ${testTitle} \n`);
    await client.deleteSession();
    
  });

  it('should navigate to Account tab', async function () {
    await clickNavBarItem(client, NAVBAR_SELECTORS.navItems.account);
    await findHeaderInFirstViewGroup(client, 'Account');
  });
});
```

---

## How to Write a New Test

> **Tip:** Use `.only` to run a single test (`it.only`) or describe block for debugging. This isolates the test and speeds up development.

1. **Add regression tests in `e2e.spec.ts`** or create a new test in a new file in `tests/`.

2. **Decide what you want to test.**  
   Example: Navigating to a topic and verifying its blurb.

3. **Use or create a component helper** for actions related to specific pages or features (e.g., clicking a tab, toggling language, or interacting with a button that changes sources).

4. **Use utility functions** for gestures, color checks, text finding, or other non-page specific actions.

5. **Structure:**
   - Use `beforeEach` to set up the app state.
   - Use `afterEach` to clean up (close session, set BrowserStack status).
   - Use `it` blocks for each scenario (test case).

6. **Keep your test code clean:**
   - When writing a test, you should only call helper functions (from `components/` or `utils/`).
   - You should *not* need to know the details of selectors or logging, as these are handled for you in the helpers.

7. **Log important steps** and always log errors (check error_constants.ts for standardized messages).

8. **Remove .only** before committing your test file to ensure all tests run in CI.

9. **Test Case Example:**

```javascript
it('Verify Aleinu topic loads with correct blurb', async function () {
  // use function from components/navbar.ts
  await clickNavBarItem(client, 'Topics');
  // use functions from utils/text_finder.ts (improved function names)
  await verifyExactTitle(client, 'Explore by Topic');
  let aleinuButton = await findTextElement(client, 'Aleinu');
  await aleinuButton.click();
  // Use functions from components/topics_page.ts (improved function names)
  await verifyTopicTitle(client, 'Aleinu');
  await verifyTopicCategory(client, 'PRAYER');
  // Check if blurb is on page
  await verifyTopicBlurb(client, 'The concluding reading of prayer services...');
});
```

---

## How to Create a Component

- Components live in [`components/`](./android/testing-framework/components/).
- Component files follow the Page Object Model pattern: each file represents a page or feature and exports functions for interacting with it.
- Use clear, descriptive function names (e.g., `verifyTopicTitle`, `navigateBackFromTopic`).
- **Import constants** from the centralized constants directory instead of hardcoding values.
- Document each function with JSDoc comments.
- Use selectors that are robust (prefer content-desc or text over index).

**Example: `components/topics_page.ts`**

```javascript
import { BASE_SELECTORS, OPERATION_TIMEOUTS } from '../constants';

/**
 * Navigates back from the current topic to the topics list.
 * @param client - The WebdriverIO browser client.
 * @returns {Promise<void>} - Resolves when the back navigation is complete.
 */
export async function navigateBackFromTopic(client: Browser): Promise<void> {
  const backButton = await client.$(BASE_SELECTORS.BACK_BUTTON);
  if (await backButton.waitForDisplayed({ timeout: OPERATION_TIMEOUTS.ELEMENT_WAIT }).catch(() => false)) {
    await backButton.click();
    console.debug("Successfully navigated back from topic page.");
  } else {
    throw new Error("❌ Back button not found or not visible on topic page.");
  }
}

```

---

## How to Add a Utility Function

- Utilities live in [`utils/`](./android/testing-framework/utils/).
- Add new helpers for gestures, color checks, API calls, etc.
- Keep functions generic and reusable across many different pages.
- **Import constants** from the centralized constants directory for consistency.
- Use improved function names that clearly indicate their purpose.
- Document each function with JSDoc comments.

**Example: `utils/text_finder.ts`**

```javascript
import { DYNAMIC_ERRORS, ELEMENT_TIMEOUTS, TEXT_SELECTORS } from '../constants';

/**
 * Clicks an element by its content-desc and logs its content-desc.
 * @param client WebdriverIO browser instance
 * @param contentDesc The content-desc of the element to click
 * @param elementName The name to use in logs and errors
 */
export async function clickElementByContentDesc(client: Browser, contentDesc: string, elementName: string): Promise<void> {
    const selector = TEXT_SELECTORS.byContentDesc(contentDesc);
    const elem = await client.$(selector);
    const isDisplayed = await elem.waitForDisplayed({ timeout: ELEMENT_TIMEOUTS.STANDARD }).catch(() => false);
    if (isDisplayed) {
        await elem.click();
        console.debug(`Clicked element with content-desc: '${contentDesc}'`);
    } else {
        throw new Error(DYNAMIC_ERRORS.elementNameNotFound(elementName));
    }
}

```

---

## Common Patterns & Examples

### Common Patterns with Constants

- **Checking for text:**  

  ```javascript
  import { TEXT_PATTERNS } from '../constants';
  await findTextElement(client, TEXT_PATTERNS.SEARCH_PLACEHOLDER);
  ```

- **Clicking by content-desc:**  

  ```javascript
  import { BASE_SELECTORS } from '../constants';
  await clickElementByContentDesc(client, BASE_SELECTORS.NAVBAR_SEARCH, 'Search button');
  ```

- **Swiping/scrolling:**  

  ```javascript
  import { SWIPE_GESTURES } from '../constants';
  await swipeUpOrDown(client, SWIPE_GESTURES.STANDARD_SWIPE.direction, SWIPE_GESTURES.STANDARD_SWIPE.distance);
  ```

- **Pixel/color checks:**  

  ```javascript
  import { SEFARIA_COLORS } from '../constants';
  await checkViewGroupCenterPixelColor(client, selector, SEFARIA_COLORS.PRIMARY_BLUE);
  ```

- **API data:**  

  ```javascript
  const parashat = await getCurrentParashatHashavua();
  const haftarah = await getCurrentHaftarah();
  ```

### Timeouts and Wait Times

Always use constants for consistent timing:

 * Waits for the specified condition to be met within the given timeout.

 * Note: Specifying a timeout inside `wait` is not strictly necessary since `await` handles it automatically,

 * but it is included here to ensure the operation fails if the condition is not met in time.

```javascript
import { OPERATION_TIMEOUTS } from '../constants';

await element.waitForDisplayed({ timeout: OPERATION_TIMEOUTS.ELEMENT_WAIT });
await client.pause(OPERATION_TIMEOUTS.SHORT_DELAY);
```

---

## Debugging & Troubleshooting

- **Logs:**  
  All console output is saved to `android/logs-test/`.
- **Screenshots:**  
  Failed color checks save images to `android/diff-images/`.
- **Uncaught errors:**  
  Are logged and will fail the test.
- **Flaky selectors:**  
  If a selector is unreliable, try to use content-desc or text instead of index.
- **Cannot read .ts extension:**  
  If you see this error, it usually means you have an unused import or variable in your test or helper file. Check for any imports that are not used in the code.

---

[⬅ README](./README.md)
