## Sefaria App Automated Testing - Guide to Writing Tests, Components, and Utilities

This document explains **how to write new tests**, **create reusable components**, and **add utility functions** for the Sefaria Android automated testing framework.  
It is intended for both new contributors and experienced maintainers.

---

## Table of Contents

- [General Principles](#general-principles)
- [Test File Structure & Best Practices](#test-file-structure--best-practices)
- [How to Write a New Test](#how-to-write-a-new-test)
- [How to Create a Component](#how-to-create-a-component)
- [How to Add a Utility Function](#how-to-add-a-utility-function)
- [Common Patterns & Examples](#common-patterns--examples)
- [Debugging & Troubleshooting](#debugging--troubleshooting)
- [References](#references)

---



## Important Notes on Async/Await and Imports

- **Always use `await`** when calling asynchronous helper functions (most UI actions and checks are async). Omitting `await` can cause tests to pass or fail incorrectly, or lead to race conditions.
- **Use all imports:** If you import a function or constant, make sure it is actually used in your test or helper file. Unused imports may cause linter or build errors, and can clutter the codebase.
- **Linting and errors:** The test framework and linter will warn or error if you forget to use `await` or have unused imports. Fix these issues promptly to ensure reliable and maintainable tests.


- **Keep tests independent:** Each test should set up its own state and not depend on previous tests.
- **Use page/component helpers:** Place repeated UI actions in `components/` files.
- **Use utility functions:** Place cross-cutting helpers (e.g., color checks, gestures) in `utils/`.
- **Keep tests clean:** Do not use selectors or log statements directly in your test files. All selectors and logging should be handled inside reusable functions in `components/` or `utils/`. This makes tests easier to read and maintain, and ensures consistent logging and selector usage across the project.
- **Log clearly:** Use `console.log` for important steps and always log errors (inside helpers).
  - **Use emojis** to indicate success (✅) or failure (❌) in logs.
  - **check constants/error_constants.ts** for standardized error messages.
  - **Use logError() function** to log errors to the test-log file.
- **Fail fast:** Throw errors as soon as a check fails, with clear messages.
- **Prefer selectors by content-desc or text:** Avoid brittle index-based selectors when possible.
  - The tests can only see what is currently displayed on the screen, so if you use an index selector, it may not work if the UI changes.

---

## Test File Structure & Best Practices

- All test files live in [`android/testing-framework/tests/`](./tests/).
- Use `describe` blocks for grouping related tests.
- Use `beforeEach`/`afterEach` for setup and teardown.
- Use helpers from `components/` and `utils/` for all non-trivial actions.
- Log the start and end of each test for traceability.
- Save logs and screenshots for failed tests (handled automatically).

**Example Test Skeleton:**

```typescript
import { remote } from 'webdriverio';
import { getOpts } from '../utils/load_credentials';
import { waitForNavBar, clickNavBarItem } from '../components/navbar';
import { checkForHeader } from '../utils/text_finder';

describe('Sefaria App Navigation', function () {
  this.timeout(200000);
  let client: WebdriverIO.Browser;


  beforeEach(async function () {
    let testTitle = this.test?.title?.replace(/.*before each.*hook for /, '') || 'Test';
    console.log(`ℹ️ Running test: ${testTitle}`);
    client = await remote(getOpts(buildName, testTitle, noReset));

    // Handle offline pop-up if it appears
    if (await waitForOfflinePopUp(client, 15000)) {
      await clickNotNowIfPresent(client);
      await clickOkIfPresent(client);
    }
  });

  afterEach(async function () {
    if (client) {
      if (process.env.RUN_ENV !== 'local') {
        const status = this.currentTest?.state === 'passed' ? 'passed' : 'failed';
        const reason = this.currentTest?.err?.message || 'No error message';
        try {
          await setBrowserStackStatus(client, status, reason);
        } catch (e) {
          console.error('❌ Failed to set BrowserStack session status:', e);
        }
      }
      console.log(`🎉 Finished test: ${this.currentTest?.title || 'test'} \n`);
      await client.deleteSession();
    }
  });

  it('should navigate to Account tab', async function () {
    await waitForNavBar(client);
    await clickNavBarItem(client, 'Account');
    await checkForHeader(client, 'Account');
  });
});
```

---


## How to Write a New Test

> **Tip:** Most helper functions (from `components/` or `utils/`) are asynchronous and must be called with `await`. Always check if a function returns a Promise and use `await` to avoid subtle bugs.

> **Tip:** If you import a function or constant, make sure to use it in your code. Unused imports will cause errors or warnings during linting or build.

> **Tip:** Use `.only` to run a single test (`it.only`) or describe block for debugging. This isolates the test and speeds up development.

1. **Decide what you want to test.**  
   Example: Navigating to a topic and verifying its blurb.

2. **Use or create a component helper** for repeated actions (e.g., clicking a tab, toggling language).

3. **Use utility functions** for gestures, color checks, or text finding.

4. **Add regression tests in `e2e.spec.ts`** or create a new test in a new file in `tests/`.


5. **Structure:**
   - Use `beforeEach` to set up the app state.
   - Use `afterEach` to clean up (close session, set BrowserStack status).
   - Use `it` blocks for each scenario.

6. **Keep your test code clean:**
   - When writing a test, you should only call helper functions (from `components/` or `utils/`).
   - You should *not* need to know the details of selectors or logging, as these are handled for you in the helpers.

7. **Log important steps** and always log errors (inside helpers).

8. **Example:**

```typescript
it('should verify the Aleinu topic page', async function () {
  await waitForNavBar(client);
  await clickNavBarItem(client, 'Topics');
  await checkForHeader(client, 'Explore by Topic');
  let aleinuButton = await isTextOnPage(client, 'Aleinu');
  await aleinuButton.click();
  await getTopicTitle(client, 'Aleinu');
  await getCategory(client, 'PRAYER');
  await getBlurb(client, 'The concluding reading of prayer services...');
});
```

---

## How to Create a Component

- Components live in [`components/`](./components/).
- Each file should export functions for interacting with a specific page or feature.
- Use clear, descriptive function names (e.g., `clickBackButton`, `getTopicTitle`).
- Document each function with JSDoc comments.
- Use selectors that are robust (prefer content-desc or text over index).

**Example: `topics_page.ts`**

```typescript
/**
 * Clicks the back button on the Topics page.
 * @param client - The WebdriverIO browser client.
 * @returns {Promise<void>} - Resolves when the back button is clicked.
 */
export async function clickBackButton(client: Browser): Promise<void> {
  const backButtonXPath = "...";
  const backButton = await client.$(backButtonXPath);
  if (await backButton.waitForDisplayed({ timeout: 4000 }).catch(() => false)) {
    await backButton.click();
    console.log("✅ Back button clicked on Topics page.");
  } else {
    throw new Error("❌ Back button not found or not visible on Topics page.");
  }
}
```

---

## How to Add a Utility Function

- Utilities live in [`utils/`](./utils/).
- Each file should have a clear header comment describing its purpose.
- Add new helpers for gestures, color checks, API calls, etc.
- Keep functions generic and reusable.
- Document parameters and return values.

**Example: `text_finder.ts`**

```typescript
/**
 * Clicks an element by its content-desc and logs its content-desc.
 * @param client WebdriverIO browser instance
 * @param contentDesc The content-desc of the element to click
 * @param elementName The name to use in logs and errors
 */
export async function clickElementByContentDesc(client: Browser, contentDesc: string, elementName: string): Promise<void> {
    const selector = `//android.view.ViewGroup[@content-desc="${contentDesc}"]`;
    const elem = await client.$(selector);
    const isDisplayed = await elem.waitForDisplayed({ timeout: 4000 }).catch(() => false);
    if (isDisplayed) {
        const desc = await elem.getAttribute('content-desc');
        await elem.click();
        console.log(`✅ Clicked element with content-desc: '${desc}'`);
    } else {
        throw new Error(logError(`❌ "${elementName}" element not found or not visible on Topics page.`));
    }
}
```

---

## Common Patterns & Examples

- **Checking for text:**  
  Use `isTextOnPage` or `isTextContainedOnPage` from `text_finder.ts`.
- **Clicking by content-desc:**  
  Use `clickElementByContentDesc` from `text_finder.ts`.
- **Swiping/scrolling:**  
  Use `swipeUpOrDown` or `scrollTextIntoView` from `gesture.ts`.
- **Pixel/color checks:**  
  Use `checkViewGroupCenterPixelColor` or `checkElementByContentDescPixelColor` from `ui_checker.ts`.
- **API data:**  
  Use `getCurrentParashatHashavua`, `getCurrentHaftarah`, etc. fr om `sefariaAPI.ts`.

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
- **Run a single test:**
  Add .only to a describe or it block to isolate and debug a specific test.

---

## References

- [Appium Inspector](https://github.com/appium/appium-inspector/releases) - For finding selectors.
- [WebdriverIO Docs](https://webdriver.io/docs/api/) - For API reference.
- [Project README](./ReadMe.md) - For setup and running instructions.
- [File Overview](./FILE_OVERVIEW.md) - For a summary of all files and their roles.

---
