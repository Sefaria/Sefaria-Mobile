# File & Folder Overview

A reference for every file and folder in `automatic-e2e-tests/` and its role. Use it to find
where something lives or where new code should go.

For the *why* behind the structure, see [CLAUDE.md](./CLAUDE.md) and [TEST_GUIDE.md](./TEST_GUIDE.md).

---

## Top-level files

| File | Role |
| --- | --- |
| `package.json` | Dependencies and the `<suite>:<platform>:<env>` npm scripts (+ `*:parallel`, `cleanup`). |
| `tsconfig.json` | TypeScript config. No build step — `ts-node` transpiles + type-checks specs at run time. |
| `.mocharc.json` | Mocha config for `test:*` — runs all `tests/**/*.spec.ts` (regression + sanity). |
| `.mocharc.regression.json` | Mocha config for `regression:*` — runs `tests/regression.spec.ts` only. |
| `.mocharc.sanity.json` | Mocha config for `sanity:*` — runs `tests/sanity.spec.ts` only. |
| `log_init.ts` | Imported at the top of each spec; mirrors `console.log/error/debug` into `logs/<platform>/clean-*.log` and captures uncaught errors. |
| `devices.json` | Device matrix (Android + iOS, with BrowserStack model/OS) for parallel runs. |
| `example.env` | Template for `.env` — BrowserStack creds, app ids, local device + app paths. |
| `.gitignore` | Ignores `node_modules/`, `.env*`, build output, `logs/`+`screenshots/` contents, and app binaries (`*.apk/.aab/.ipa`). |
| `README.md` / `SETUP.md` / `TEST_GUIDE.md` / `CLAUDE.md` | Documentation (see [docs index](#documentation)). |

---

## `tests/`

The actual Mocha test suites. Each opens **one Appium session per suite** and imports
`../log_init`.

- **`regression.spec.ts`** — full end-to-end regression suite (`REG-001`…`REG-008`): search,
  Tanakh browsing, language toggle, category divider colors, Learning Schedules (with live
  Sefaria API checks), Mishnah sub-categories, the dedication modal, and the Topics flow.
- **`sanity.spec.ts`** — fast smoke suite (`S001`…`S005`): app launch, navbar cycling, search,
  language toggle, and opening a canonical text.
- Add new `*.spec.ts` files here for additional features; they're picked up by `test:*` and
  `*:parallel`.

---

## `components/`

Page Object Model (POM) helpers — each file represents one screen/feature and exports the
actions + verifications for it. Imported via the `index.ts` barrel.

| File | Role |
| --- | --- |
| `navbar.ts` | `Navbar` — wait for the navbar, click nav items by content-desc, close pop-ups. |
| `search_page.ts` | `SearchPage` — type into the search bar, select from results, verify/clear the bar. |
| `reader_page.ts` | `ReaderPage` — verify reader titles (exact/contains), find text by accessibility id, back button. |
| `display_settings.ts` | `DisplaySettings` — open display settings, toggle language. |
| `topics_page.ts` | `TopicsPage` — verify topic title/category/blurb, switch Sources/Sheets, three-dots menu, back. |
| `index.ts` | Re-exports all components under PascalCase namespaces (`Navbar`, `ReaderPage`, …). |

---

## `utils/`

Cross-cutting helpers for low-level actions, API calls, reporting, and session setup. Imported
via the `index.ts` barrel.

| File | Role |
| --- | --- |
| `text_finder.ts` | `TextFinder` — locate/verify elements by exact text, substring, header, or content-desc. **Used everywhere.** |
| `gesture.ts` | `Gesture` — swipes and scroll-into-view, with screen-dimension caching and platform-aware visibility (Android `UiScrollable` / iOS swipe fallback). |
| `ui_checker.ts` | `UiChecker` — pixel/color validation of elements and ViewGroups, screenshots, debug-image saving (uses `pngjs`). |
| `sefaria_api.ts` | `SefariaAPI` — fetch + cache the Sefaria calendar API (Daf Yomi, Haftarah, Parashat Hashavua, Daf a Week). |
| `browserstack_report.ts` | `BrowserstackReport` — set session/suite status and annotate individual tests on BrowserStack. |
| `popups.ts` | `PopUps` — handle the offline popup and run the background donation-popup monitor. |
| `load_credentials.ts` | `LoadCredentials` — build Appium/WebdriverIO capabilities for local vs. BrowserStack, per platform. |
| `helper_functions.ts` | `HelperFunctions` — setup/teardown, build/test-title helpers, Hebrew date, color/regex helpers, assertions. |
| `index.ts` | Re-exports all utils under PascalCase namespaces. |

---

## `constants/`

Centralized configuration — no magic numbers in code.

| File | Role |
| --- | --- |
| `timeouts.ts` | `ELEMENT_TIMEOUTS`, `TEST_TIMEOUTS`, `OPERATION_TIMEOUTS`. |
| `gesture_constants.ts` | `SWIPE_CONFIG`, `GESTURE_TIMING`, `SWIPE_ATTEMPTS`, `TOUCH_CONFIG`, `SCREEN_POSITIONS` — distances/timings auto-scale for BrowserStack. |
| `colors.ts` | `SEFARIA_COLORS` brand palette and `COLOR_THRESHOLDS` for pixel comparison. |
| `errors.ts` | `logError`, `STATIC_ERRORS`, `DYNAMIC_ERRORS`, `SUCCESS_MESSAGES` — consistent logging + assertion messages. |
| `text_constants.ts` | `Texts` — reusable content fixtures (`BAMIDBAR_1`, `MISHNAH`, `ALEINU`, `HEBREW_MONTHS`). |
| `index.ts` | Re-exports the above **and** dynamically loads the platform `Selectors` based on `PLATFORM`, plus exports `PLATFORM`. |

---

## `selectors/`

Platform-specific element locators. `constants/index.ts` loads the right one at runtime.

- **`selectors/android/selectors.ts`** — Android UiSelector / UiScrollable patterns + XPath.
- **`selectors/ios/selectors.ts`** — iOS XCUITest XPath patterns.

> Both files export the **same keys** (`TEXT_SELECTORS`, `NAVIGATION_SELECTORS`,
> `READER_SELECTORS`, `TOPICS_SELECTORS`, `VIEWGROUP_SELECTORS`, …). Always add a new selector
> to both with the identical key — that is what keeps the framework cross-platform.

---

## `scripts/`

| File | Role |
| --- | --- |
| `run-parallel-tests.js` | Reads `devices.json`, spawns one Mocha child per device for the current `PLATFORM` (BrowserStack), tagging logs by device and parsing failures into a summary. Honors `MOCHA_CONFIG` / `SPEC`. |
| `cleanup.js` | Whitelisted cleaner — empties `logs/<platform>/` and `screenshots/<platform>/` (creates them if missing). Refuses paths outside the project. |

---

## Generated artifacts (git-ignored contents)

- **`logs/android/`, `logs/ios/`** — `clean-*.log` (reader-friendly) and `verbose-*.log`
  (full Appium output, parallel runs).
- **`screenshots/android/`, `screenshots/ios/`** — `FAIL_*.png` on failures, plus cropped/full
  debug images for failed color checks.

---

## Documentation

| Doc | Purpose |
| --- | --- |
| [README.md](./README.md) | Overview, quick start, full command reference. |
| [SETUP.md](./SETUP.md) | Install, local + cloud/CI setup, troubleshooting, Appium Inspector. |
| [TEST_GUIDE.md](./TEST_GUIDE.md) | Authoring tests, components, and utilities. |
| [CLAUDE.md](./CLAUDE.md) | Condensed architecture/conventions/gotchas (for AI agents and fast onboarding). |
| [FILE_OVERVIEW.md](./FILE_OVERVIEW.md) | This file. |

---

[⬅ Back to README](./README.md)
