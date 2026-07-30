# Test Authoring Guide

How to write **cross-platform** tests, build reusable **components** (Page Objects), and add
**utilities** for the Sefaria Mobile E2E framework — covering both Android and iOS.

Read [README.md](./README.md) for the overview and [CLAUDE.md](./CLAUDE.md) for the condensed
architecture/conventions reference. This guide goes deeper on the *how*.

---

## Table of contents

- [General principles](#general-principles)
- [The layered architecture](#the-layered-architecture)
- [Constants & selectors](#constants--selectors)
- [Test file structure & lifecycle](#test-file-structure--lifecycle)
- [How to write a new test](#how-to-write-a-new-test)
- [How to create a component](#how-to-create-a-component)
- [How to add a utility](#how-to-add-a-utility)
- [Common patterns](#common-patterns)
- [Platform gotchas](#platform-gotchas)
- [Debugging & troubleshooting](#debugging--troubleshooting)

---

## General principles

- **Write cross-platform.** Every helper and test must work on both Android and iOS. Isolate
  any unavoidable platform-specific logic inside helpers/utilities — never in a test file.
- **Tests read like user stories.** A test file describes *what* the user does; the *how*
  (selectors, waits, logging, error throwing) lives in components and utils.
- **No selectors or `console.log` in tests.** Always go through `Selectors`, components, and
  utils — they own locator resolution, logging, and assertions.
- **Fail fast with clear messages.** Throw as soon as a check fails, using the helpers in
  [`constants/errors.ts`](./constants/errors.ts) so failures are logged consistently.
- **Prefer robust locators.** Use content-desc / accessibility label / text over brittle
  index-based XPath. Index-based selectors exist only where the app exposes no stable id, and
  they are known-flaky.

---

## The layered architecture

```text
tests/        Mocha specs — high-level scenarios. No selectors, no logging.
  │
components/   Page Object Model — one file per screen/feature (Navbar, SearchPage, ReaderPage,
  │           DisplaySettings, TopicsPage). Encapsulates actions + verifications for that page.
  │
utils/        Cross-cutting helpers — gestures, text/element finding, color checks, Sefaria API,
  │           BrowserStack reporting, popups, session options, misc helpers.
  │
constants/    Timeouts, gesture config, colors, errors, text fixtures + the dynamic Selectors loader.
  │
selectors/    Platform-specific locators: selectors/android/ and selectors/ios/ (identical keys).
```

Both `components/index.ts` and `utils/index.ts` re-export modules under PascalCase namespaces,
so call sites read naturally: `Navbar.clickNavBarItem(...)`, `TextFinder.verifyHeaderOnPage(...)`,
`Gesture.swipeIntoView(...)`.

---

## Constants & selectors

All constants are centralized in [`constants/`](./constants/) and imported from its index:

```typescript
import { Selectors, TEST_TIMEOUTS, Colors, SWIPE_CONFIG, Texts, Errors } from '../constants';
```

### How platform selection works

`constants/index.ts` reads the `PLATFORM` env var and dynamically loads the matching selector
file, re-exporting it as `Selectors`:

```typescript
// constants/index.ts (simplified)
export const PLATFORM = process.env.PLATFORM || 'android';
const Selectors = PLATFORM === 'ios'
  ? require('../selectors/ios/selectors')
  : require('../selectors/android/selectors');
export { Selectors };
```

Because both selector files export the **same keys**, your code references `Selectors.*` once
and runs unchanged on both platforms.

### Adding a selector — the golden rule

> **Add every new selector to BOTH [`selectors/android/selectors.ts`](./selectors/android/selectors.ts)
> and [`selectors/ios/selectors.ts`](./selectors/ios/selectors.ts) under the identical key.**

```typescript
// selectors/android/selectors.ts
export const NAVBAR_SELECTORS = {
  navItems: {
    account: 'Account',
    topics: 'Topics',
    saved: 'Saved',   // new — content-desc used by NAVIGATION_SELECTORS.navBarItem(...)
  },
} as const;

// selectors/ios/selectors.ts
export const NAVBAR_SELECTORS = {
  navItems: {
    account: 'Account',
    topics: 'Topics',
    saved: 'Saved',   // new — SAME key, iOS value
  },
} as const;
```

If a selector is irrelevant on one platform, still add a placeholder/comment so the keys stay
aligned. Mismatched keys are the #1 cause of "works on Android, crashes on iOS."

---

## Test file structure & lifecycle

Specs live in [`tests/`](./tests/) and use **one Appium session per suite** (not per test).
Study [`tests/regression.spec.ts`](./tests/regression.spec.ts) and
[`tests/sanity.spec.ts`](./tests/sanity.spec.ts) as the canonical examples.

The lifecycle hooks:

| Hook | What it does |
| --- | --- |
| `before()` | Opens **one** session (`remote(LoadCredentials.getOpts(...))`) and runs `HelperFunctions.handleSetup(client, true)` — dismiss offline popup, wait for navbar, tap Texts, **start the background popup monitor**. |
| `beforeEach()` | Resets to a known state by tapping the Texts tab. Does **not** open a new session. |
| `afterEach()` | `HelperFunctions.handleTeardown(client, this, testTitle, false)` — report pass/fail to BrowserStack, screenshot on failure, **keep the session alive** (`deleteSession=false`). |
| `after()` | Stop the popup monitor, set final BrowserStack suite status, delete the session, print a pass/fail summary. |

Because the session is shared, tests are **not** fully isolated — each test should leave the
app navigable, and `beforeEach` returns to Texts. Keep tests resilient to prior state.

### Canonical spec skeleton

```typescript
import { remote } from 'webdriverio';
import { Navbar } from '../components';
import { LoadCredentials, HelperFunctions, TextFinder, BrowserstackReport, UiChecker, PopUps } from '../utils';
import { TEST_TIMEOUTS, Selectors } from '../constants';
import '../log_init';   // mirrors console output into logs/<platform>/clean-*.log

const NO_RESET = false; // false = fresh app state each session
const buildName = HelperFunctions.getBuildName('Regression');
const SuiteName = 'Regression Suite Tests for Sefaria Mobile';

describe('Sefaria Mobile regression tests', function () {
  this.timeout(TEST_TIMEOUTS.SINGLE_TEST);
  let client: WebdriverIO.Browser;
  let testTitle: string;

  before(async function () {
    try {
      client = await remote(LoadCredentials.getOpts(buildName, SuiteName, NO_RESET));
      console.log(`[REGRESSION START] ${SuiteName}`);
      await HelperFunctions.handleSetup(client, true);  // true = start popup monitor
    } catch (err) {
      UiChecker.takeScreenshot(client, testTitle, 'FAIL');
      throw new Error(`[SESSION ERROR] Could not create session: ${err}`);
    }
  });

  beforeEach(async function () {
    testTitle = HelperFunctions.getTestTitle(this);
    console.log(`[STARTING] Running test: ${testTitle}`);
    await Navbar.clickNavBarItem(client, Selectors.NAVBAR_SELECTORS.navItems.texts);
  });

  afterEach(async function () {
    await HelperFunctions.handleTeardown(client, this, testTitle, false); // keep session
  });

  after(async function () {
    if (client) {
      PopUps.stopGlobalPopupMonitor();
      if (process.env.RUN_ENV === 'browserstack') {
        await BrowserstackReport.setBrowserstackSuiteStatus(client, this, 'Regression Suite');
      }
      await client.deleteSession();
      await HelperFunctions.logTestResults(this);
    }
  });

  it('REG-XXX: Navigate to Account and verify header', async function () {
    await Navbar.clickNavBarItem(client, Selectors.NAVBAR_SELECTORS.navItems.account);
    await TextFinder.verifyHeaderOnPage(client, 'Account');
  });
});
```

---

## How to write a new test

1. **Pick a suite.** Add full scenarios to [`regression.spec.ts`](./tests/regression.spec.ts),
   quick smoke checks to [`sanity.spec.ts`](./tests/sanity.spec.ts), or create a new
   `tests/<feature>.spec.ts` (it's picked up by `test:*` and `*:parallel`).
2. **Name clearly.** Prefix with an id and describe the flow in one sentence, e.g.
   `it('REG-009: Bookmark a source and verify it appears under Saved', ...)`.
3. **Compose from helpers only.** Use components for page actions and utils for gestures /
   text finding / color checks. No raw selectors, no `console.log` in the test body.
4. **Keep it cross-platform.** No `if (PLATFORM === 'ios')` branches in tests — push that into
   a helper.
5. **Remove any `.only`** before committing.

```typescript
import { Navbar } from '../components';
import { TextFinder } from '../utils';
import { Selectors } from '../constants';

it('should open the Topics tab and verify the header', async function () {
  await Navbar.clickNavBarItem(client, Selectors.NAVBAR_SELECTORS.navItems.topics);
  await TextFinder.verifyHeaderOnPage(client, 'Explore by Topic');
});
```

---

## How to create a component

Components are Page Object helpers in [`components/`](./components/) — one file per screen or
feature, exporting functions that encapsulate actions and verifications.

1. Create `components/<page>.ts`. Import `Selectors` (and any other constants) from
   `../constants` and shared helpers from `../utils`.
2. Use descriptive function names (`verifyTopicTitle`, `navigateBackFromTopic`, `clickSheets`).
3. Resolve elements via `Selectors.*`; verify visibility through
   `HelperFunctions.ensureElementDisplayed(...)` for consistent waits + errors.
4. Document each exported function with JSDoc (`@param` / `@returns` / `@throws`).
5. Register it in [`components/index.ts`](./components/index.ts):

   ```typescript
   import * as bookmarksPage from './bookmarks_page';
   export const BookmarksPage = bookmarksPage;
   ```

**Example** (matches the existing style in `components/display_settings.ts`):

```typescript
import type { Browser } from 'webdriverio';
import { Selectors } from '../constants';
import { HelperFunctions } from '../utils';

/**
 * Presses the language toggle, switching page content between English and Hebrew.
 * @param client - WebdriverIO browser instance.
 * @param isEnglish - Current language; true if English (switch to Hebrew), false to switch back.
 * @returns true on success.
 * @throws If the toggle button is not displayed.
 */
export async function toggleLanguageButton(client: Browser, isEnglish: boolean = true): Promise<boolean> {
  const targetLanguage = isEnglish ? 'Hebrew' : 'English';
  const button = await client.$(Selectors.DISPLAY_SETTINGS.languageToggle(targetLanguage));
  await HelperFunctions.ensureElementDisplayed(button, `Toggle Language Button for ${targetLanguage}`);
  await button.click();
  console.debug(`Pressed toggle language button: switching to ${targetLanguage}.`);
  return true;
}
```

---

## How to add a utility

Utilities are generic, cross-cutting helpers in [`utils/`](./utils/) — gestures, text finding,
color/pixel checks, API calls, etc. Keep them reusable and page-agnostic.

1. Create `utils/<thing>.ts`. Import constants from `../constants`; cross-reference sibling
   utils via the barrel (`import { HelperFunctions } from '.';`).
2. Register it in [`utils/index.ts`](./utils/index.ts):

   ```typescript
   import * as myUtil from './my_util';
   export const MyUtil = myUtil;
   ```

3. Use constants instead of magic numbers — `ELEMENT_TIMEOUTS`, `SWIPE_CONFIG`,
   `COLOR_THRESHOLDS`, etc. Gesture distances/timings in `gesture_constants.ts` auto-scale for
   BrowserStack (slower devices), so always import them rather than hardcoding pixels.

```typescript
import type { Browser } from 'webdriverio';
import { ELEMENT_TIMEOUTS } from '../constants';

/**
 * Waits for an element to be displayed and returns it.
 */
export async function waitForVisible(client: Browser, selector: string) {
  const elem = await client.$(selector);
  await elem.waitForDisplayed({ timeout: ELEMENT_TIMEOUTS.LONG_WAIT });
  return elem;
}
```

---

## Common patterns

**Find and click an element by exact text:**

```typescript
import { TextFinder } from '../utils';
await (await TextFinder.findTextElement(client, 'See All')).click();
```

**Substring match (when the text is part of a larger string):**

```typescript
await TextFinder.findTextContaining(client, 'Dedicated in honor of');
```

**Verify a page header:**

```typescript
await TextFinder.verifyHeaderOnPage(client, 'Explore by Topic');
```

**Scroll an element into view** (Android uses `UiScrollable`; iOS falls back to swiping):

```typescript
import { Gesture } from '../utils';
import { SWIPE_CONFIG, SWIPE_ATTEMPTS } from '../constants';

await Gesture.autoScrollTextIntoView(client, 'Daf Yomi');
await Gesture.swipeIntoView(client, SWIPE_CONFIG.DIRECTIONS.UP, 'Daf a Week',
  false, SWIPE_ATTEMPTS.MAX_SCROLL_ATTEMPTS, SWIPE_CONFIG.PAGE_SCROLL_DISTANCE);
```

**Validate a UI color** (pixel check; saves a debug image on mismatch):

```typescript
import { UiChecker } from '../utils';
import { Colors } from '../constants';
await UiChecker.validateViewGroupCenterColor(client, 2, Colors.SEFARIA_COLORS.TANAKH_TEAL);
```

**Assert against live Sefaria data** (calendar API, cached per run):

```typescript
import { SefariaAPI } from '../utils';
const parasha = await SefariaAPI.getCurrentParashatHashavua();
if (parasha) await TextFinder.findTextElement(client, parasha.displayValue.en);
```

**Reuse text fixtures** instead of inlining strings:

```typescript
import { Texts } from '../constants';
await TextFinder.findTextContaining(client, Texts.MISHNAH.blurb);
```

---

## Platform gotchas

These have bitten people — keep them in mind when writing tests:

- **Search results won't appear unless the field looks mid-edit.** Appium sets the value
  atomically, so the live results list often doesn't render. Type the query truncated/repeated
  so it looks like you're still typing — e.g. `typeIntoSearchBar(client, 'Sefat Emet, Genesis, Genesi')`
  then `selectFromList(client, 'Sefat Emet, Genesis, Genesis')`.
- **Hebrew `"` breaks iOS XPath.** `תנ"ך` fails on iOS — match the prefix `'תנ'` instead. Avoid
  embedding `"` in Hebrew match strings.
- **English reader text needs an invisible LTR prefix.** Call
  `ReaderPage.findTextByAccessibilityId(client, text, /* isEnglish */ true)` so it prepends
  `ACCESSIBILITY_PATTERNS.englishTextPrefix`.
- **iOS keeps off-screen elements in the DOM.** Trust `Gesture` visibility checks, not bare
  `isDisplayed()`, for "is it actually on screen."
- **ViewGroup-index color checks are flaky** — indexes shift as you scroll and many colored
  elements have no id. Keep such checks above-the-fold (see REG-004's notes).

---

## Debugging & troubleshooting

- **Logs:** clean output in `logs/<platform>/clean-*.log`; full Appium chatter in
  `verbose-*.log` (parallel runs).
- **Screenshots:** failures save to `screenshots/<platform>/FAIL_*.png`; failed color checks
  also dump cropped + full debug images.
- **Focus one test:** add `.only` to an `it`/`describe`, then remove it before committing. If
  only one test runs unexpectedly, a stray `.only` is why.
- **Flaky selector?** Switch from index-based XPath to content-desc / accessibility label / text.
- **"Cannot read `.ts` extension" / compile errors:** usually an unused import or a type error
  in a spec/helper (`ts-node` type-checks at run time).

---

**Remember:**

- New selectors go in **both** `selectors/android/selectors.ts` and `selectors/ios/selectors.ts`
  with the **same key**.
- Tests call helpers and constants only — never hardcode selectors or log directly.
- No platform branches in test files — push platform differences into helpers.

[⬅ Back to README](./README.md)
