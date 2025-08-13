/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Centralized UI Selector Constants for Testing Framework on iOS
 * 
 * DESCRIPTION:
 *  - Contains all UiSelector patterns, content descriptions, and element selectors
 *  - Organized by component type and functionality for easy maintenance
 * USAGE:
 *  - Import specific selector objects/functions to replace hardcoded selectors
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
  // Finds the smallest text element that matches the exact text
  // Smart way to deal with iOS text elements that are not split up by text
  // e.g ('Torah Reading Devarim') insteads of on android where 'Devarim' is its own text element
  exactText: (text: string) =>
    `//*[(contains(@name,'${text}') or contains(@label,'${text}')) and not(*)]`,
  // IOS Exlusive
  startsWithText: (text: string) =>
    `//XCUIElementTypeOther[starts-with(@name,"${text}") or starts-with(@label,"${text}")] | //XCUIElementTypeStaticText[starts-with(@name,"${text}") or starts-with(@label,"${text}")]`,
  containsText: (text: string) => 
    TEXT_SELECTORS.exactText(text),
  byDescription: (description: string) => 
    TEXT_SELECTORS.exactText(description),
  byContentDesc: (contentDesc: string) =>
    TEXT_SELECTORS.exactText(contentDesc),
  headerInViewGroup: (headerText: string) => 
    `//XCUIElementTypeOther[starts-with(@label,"${headerText}") or @label="${headerText}"] | //XCUIElementTypeStaticText[starts-with(@name,"${headerText}")] | ${TEXT_SELECTORS.exactText(headerText)}`,
} as const;

// iOS Navigation selectors
export const NAVIGATION_SELECTORS = {
  navBar: `(//XCUIElementTypeOther)[2]`,
  navBarItem: (contentDesc: string) => 
    `//XCUIElementTypeOther[@name="${contentDesc}"]`,
  closePopUp: `//XCUIElementTypeOther[@name="Close"]`,
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
  scrollView: BASE_SELECTORS.scrollView(),
  titleTextView: `//XCUIElementTypeStaticText[1]`,
  textByAccessibilityId: (text: string) => `//XCUIElementTypeAny[@label="${text}"]`,
  backButton: `//XCUIElementTypeOther[@name="back"]`,
  displaySettings: `//XCUIElementTypeOther[@name="Open display settings"]`,
} as const;


// iOS Search Selectors
export const SEARCH_SELECTORS = {
  exactText: (text: string) => 
    `//XCUIElementTypeOther[@name="${text}" or @label="${text}"] | //XCUIElementTypeStaticText[@name="${text}" or @label="${text}"]`,
  emptySearchBar: '//XCUIElementTypeTextField[@value="Search"]',
  clearSearchBar: '//XCUIElementTypeOther[@name="close"]',
}

// iOS Display settings selectors
export const DISPLAY_SETTINGS_SELECTORS = {
  openButton: `//XCUIElementTypeButton[@name="Open display settings"]`,
  languageToggle: (targetLanguage: string) => 
    `//XCUIElementTypeOther[@name="Change language to ${targetLanguage}"]`,
  donateButton: `//XCUIElementTypeOther[@name="Donate Now"]`,
  closePopUp: `//XCUIElementTypeOther[@name="Close pop up"]`,
} as const;

// iOS Topics selectors
// Note: ios does not always have labels for topics, so we use index-based selectors (knowing it does not change often)
export const TOPICS_SELECTORS = {  
  backButton: `//XCUIElementTypeApplication/XCUIElementTypeWindow[1]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeOther[2]/XCUIElementTypeScrollView/XCUIElementTypeOther[1]/XCUIElementTypeOther/XCUIElementTypeOther[1]/XCUIElementTypeOther[1]`,
  textView: (index: number) => 
    `//XCUIElementTypeApplication/XCUIElementTypeWindow[1]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeOther[2]/XCUIElementTypeScrollView/XCUIElementTypeOther[1]/XCUIElementTypeOther/XCUIElementTypeOther[1]/XCUIElementTypeStaticText[${index}]`,
  threeDotsMenu: `//XCUIElementTypeApplication/XCUIElementTypeWindow[1]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeOther[2]/XCUIElementTypeScrollView/XCUIElementTypeOther[1]/XCUIElementTypeOther/XCUIElementTypeOther[3]`,
  sources: '//XCUIElementTypeApplication/XCUIElementTypeWindow[1]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeOther[2]/XCUIElementTypeScrollView/XCUIElementTypeOther[1]/XCUIElementTypeOther/XCUIElementTypeOther[1]/XCUIElementTypeOther[3]',
  sheets: '//XCUIElementTypeApplication/XCUIElementTypeWindow[1]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeOther[2]/XCUIElementTypeScrollView/XCUIElementTypeOther[1]/XCUIElementTypeOther/XCUIElementTypeOther[1]/XCUIElementTypeOther[4]',
  searchButton: '//XCUIElementTypeApplication/XCUIElementTypeWindow[1]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeOther[2]/XCUIElementTypeScrollView/XCUIElementTypeOther[1]/XCUIElementTypeOther/XCUIElementTypeOther[1]/XCUIElementTypeOther[6]',
} as const;

// iOS ViewGroup selectors
export const VIEWGROUP_SELECTORS = {
  byIndex: (index: number) => 
    `//XCUIElementTypeApplication/XCUIElementTypeWindow[1]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeOther[1]/XCUIElementTypeScrollView/XCUIElementTypeOther[1]/XCUIElementTypeOther/XCUIElementTypeOther[${index}] |
     //XCUIElementTypeApplication/XCUIElementTypeWindow[1]/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeOther[3]/XCUIElementTypeScrollView/XCUIElementTypeOther[1]/XCUIElementTypeOther/XCUIElementTypeOther[${index}]`,
} as const;

// iOS Accessibility patterns
export const ACCESSIBILITY_PATTERNS = {
  englishTextPrefix: '⁦',
  hebrewTextPrefix: '',
} as const;

// iOS Offline popup selectors
export const OFFLINE_POPUP_SELECTORS = {
  popupContainer: `//XCUIElementTypeAlert`,
  notNowButton: `//XCUIElementTypeButton[@name="Not Now"]`,
  okButton: `//XCUIElementTypeButton[@name="OK"]`,
} as const;

// iOS Scroll selectors
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
