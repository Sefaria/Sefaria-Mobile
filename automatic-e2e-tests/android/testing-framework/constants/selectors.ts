/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Centralized UI Selector Constants for Testing Framework
 * 
 * DESCRIPTION:
 *  - Contains all UiSelector patterns, content descriptions, and element selectors
 *  - Organized by component type and functionality for easy maintenance
 * USAGE:
 *  - Import specific selector objects/functions to replace hardcoded selectors
 * ──────────────────────────────────────────────────────────────
 */

// App constants
export const APP_PACKAGE = 'org.sefaria.sefaria';

// Base UiSelector patterns
export const BASE_SELECTORS = {
  textView: (packageName = APP_PACKAGE) => 
    `android=new UiSelector().className("android.widget.TextView").packageName("${packageName}")`,
  viewGroup: (packageName = APP_PACKAGE) => 
    `android=new UiSelector().className("android.view.ViewGroup").packageName("${packageName}")`,
  scrollView: () => 
    `android=new UiSelector().className("android.widget.ScrollView").scrollable(true)`,
} as const;

// Text-based selectors
export const TEXT_SELECTORS = {
  exactText: (text: string, packageName = APP_PACKAGE) => 
    `android=new UiSelector().className("android.widget.TextView").packageName("${packageName}").text("${text}")`,
  containsText: (text: string, packageName = APP_PACKAGE) => 
    `android=new UiSelector().className("android.widget.TextView").packageName("${packageName}").textContains("${text}")`,
  byDescription: (description: string) => 
    `android=new UiSelector().description("${description}")`,
} as const;

// Navigation selectors
export const NAVIGATION_SELECTORS = {
  navBar: `android=new UiSelector().className("android.view.ViewGroup").packageName("${APP_PACKAGE}")`,
  navBarItem: (contentDesc: string) => 
    `android=new UiSelector().className("android.view.ViewGroup").packageName("${APP_PACKAGE}").description("${contentDesc}")`,
  closePopup: '//android.view.ViewGroup[@content-desc="Close"]/android.widget.ImageView',
} as const;

// Reader page selectors
export const READER_SELECTORS = {
  scrollView: BASE_SELECTORS.scrollView(),
  titleTextView: `android=new UiSelector().className("android.widget.TextView").index(2)`,
  textByAccessibilityId: (text: string) => `~${text}`,
} as const;

// Display settings selectors
export const DISPLAY_SETTINGS_SELECTORS = {
  openButton: '~Open display settings',
  languageToggle: (targetLanguage: string) => 
    `android=new UiSelector().description("Change language to ${targetLanguage}")`,
} as const;

// Topics and search selectors
export const TOPICS_SELECTORS = {
  firstViewGroup: `android=new UiSelector().className("android.view.ViewGroup").packageName("${APP_PACKAGE}").index(0)`,
  headerInViewGroup: (headerText: string) => 
    `android=new UiSelector().className("android.widget.TextView").packageName("${APP_PACKAGE}").textContains("${headerText}")`,
  backButton: "//android.widget.ScrollView/android.view.ViewGroup/android.view.ViewGroup[1]/android.view.ViewGroup[1]/android.widget.ImageView",
  textView: (index: number) => 
    `//android.widget.ScrollView/android.view.ViewGroup/android.view.ViewGroup[1]/android.widget.TextView[${index}]`,
  sourceMenu: "//android.widget.ScrollView/android.view.ViewGroup/android.view.ViewGroup[4]",
  contentDesc: {
    sources: "Sources",
    sheets: "Sheets",
  },
} as const;

// Content description selectors  
export const CONTENT_DESC_SELECTORS = {
  byName: (name: string) => `android=new UiSelector().description("${name}")`,
  closeButton: 'Close',
  openDisplaySettings: 'Open display settings',
  navItems: {
    texts: 'Texts',
    topics: 'Topics', 
    search: 'Search',
    saved: 'Saved',
    account: 'Account',
  },
} as const;

// ViewGroup position selectors for UI testing
export const VIEWGROUP_SELECTORS = {
  byIndex: (index: number) => 
    `//android.widget.ScrollView/android.view.ViewGroup/android.view.ViewGroup[${index}]`,
  insideScrollView: (index: number) => 
    `//android.widget.ScrollView/android.view.ViewGroup/android.view.ViewGroup[${index}]`,
} as const;

// Accessibility and content-desc patterns
export const ACCESSIBILITY_PATTERNS = {
  englishTextPrefix: '\u2066', // Left-to-right invisible character for English text
  hebrewTextPrefix: '', // No prefix needed for Hebrew
} as const;

// Offline popup selectors
export const OFFLINE_POPUP_SELECTORS = {
  popupContainer: 'android=new UiSelector().resourceId("org.sefaria.sefaria:id/action_bar_root").className("android.widget.FrameLayout")',
  notNowButton: 'android=new UiSelector().resourceId("android:id/button1").text("NOT NOW").className("android.widget.Button")',
  okButton: 'android=new UiSelector().resourceId("android:id/button1").text("OK").className("android.widget.Button")',
} as const;
