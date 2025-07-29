/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: iOS-Specific UI Selector Constants
 * ──────────────────────────────────────────────────────────────
 */

// App constants
export const APP_PACKAGE = 'org.sefaria.sefaria'; // iOS bundle ID

// iOS Base selectors using XCUITest
export const BASE_SELECTORS = {
  textView: () => 
    `//XCUIElementTypeStaticText`,
  viewGroup: () => 
    `//XCUIElementTypeOther`,
  scrollView: () => 
    `//XCUIElementTypeScrollView`,
  editText: () => 
    `//XCUIElementTypeTextField`,
} as const;

// iOS Text-based selectors
export const TEXT_SELECTORS = {
  exactText: (text: string) => 
    `//XCUIElementTypeStaticText[@name="${text}" or @label="${text}"]`,
  containsText: (text: string) => 
    `//XCUIElementTypeStaticText[contains(@name,"${text}") or contains(@label,"${text}")]`,
  byDescription: (description: string) => 
    `//XCUIElementTypeAny[@name="${description}" or @label="${description}"]`,
  byContentDesc: (contentDesc: string) =>
    `//XCUIElementTypeOther[@name="${contentDesc}"]`,
} as const;

// iOS Navigation selectors
export const NAVIGATION_SELECTORS = {
  navBar: `(//XCUIElementTypeOther)[2]`,
  navBarItem: (contentDesc: string) => 
    `//XCUIElementTypeOther[@name="${contentDesc}"]`,
  closePopup: `//XCUIElementTypeButton[@name="Close"]`,
} as const;

// iOS Navbar items
export const NAVBAR_SELECTORS = {
  navItems: {
    texts: 'Texts',
    topics: 'Topics',
    search: 'Search',
    saved: 'Saved',
    account: 'Account',
  },
} as const;

// iOS Reader selectors
export const READER_SELECTORS = {
  scrollView: `//XCUIElementTypeScrollView`,
  titleTextView: `//XCUIElementTypeStaticText[1]`,
  textByAccessibilityId: (text: string) => `//XCUIElementTypeAny[@name="${text}"]`,
} as const;

// iOS Display settings selectors
export const DISPLAY_SETTINGS_SELECTORS = {
  openButton: `//XCUIElementTypeButton[@name="Open display settings"]`,
  languageToggle: (targetLanguage: string) => 
    `//XCUIElementTypeOther[@name="Change language to ${targetLanguage}"]`,
} as const;

// iOS Topics selectors
export const TOPICS_SELECTORS = {
  firstViewGroup: `(//XCUIElementTypeOther)[1]`,
  headerInViewGroup: (headerText: string) => 
    `//XCUIElementTypeStaticText[contains(@name,"${headerText}")]`,
  backButton: `//XCUIElementTypeButton[@name="Back"]`,
  textView: (index: number) => 
    `(//XCUIElementTypeStaticText)[${index}]`,
  sourceMenu: `//XCUIElementTypeButton[@name="More"]`,
  contentDesc: {
    sources: "Sources",
    sheets: "Sheets",
  },
} as const;

// iOS ViewGroup selectors
export const VIEWGROUP_SELECTORS = {
  byIndex: (index: number) => 
    `//XCUIElementTypeApplication/XCUIElementTypeWindow[1]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeOther[1]/XCUIElementTypeScrollView/XCUIElementTypeOther[1]/XCUIElementTypeOther/XCUIElementTypeOther[${index}]`,
} as const;

// iOS Accessibility patterns
export const ACCESSIBILITY_PATTERNS = {
  englishTextPrefix: '',
  hebrewTextPrefix: '',
} as const;

// iOS Offline popup selectors
export const OFFLINE_POPUP_SELECTORS = {
  popupContainer: `//XCUIElementTypeAlert`,
  notNowButton: `//XCUIElementTypeButton[@name="Not Now"]`,
  okButton: `//XCUIElementTypeButton[@name="OK"]`,
} as const;

// iOS Scroll selectors
/* eslint-disable @typescript-eslint/no-unused-vars */
export const SCROLL_SELECTORS = {
  scrollableContainer: () => 
    `//XCUIElementTypeScrollView`,
  scrollToText: (text: string, _goUp: boolean = false) => {
    // iOS uses different scrolling mechanism
    return `//XCUIElementTypeStaticText[@name="${text}" or @label="${text}"]`;
  },
  scrollToTextContains: (text: string, _goUp: boolean = false) => {
    return `//XCUIElementTypeStaticText[contains(@name,"${text}") or contains(@label,"${text}")]`;
  },
  scrollToElement: (textSelector: string, _direction: 'scrollForward' | 'scrollBackward' = 'scrollForward') => 
    `//XCUIElementTypeStaticText[${textSelector}]`,
} as const;
/* eslint-enable @typescript-eslint/no-unused-vars */