/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Reader Page Component Helpers for Testing Framework
 * 
 * DESCRIPTION:
 *  - Provides functions to interact with and validate the app's reader page content.
 *  - Includes helpers to verify page titles, check text content, and validate accessibility elements.
 *  - Uses centralized selectors and constants for consistent element identification.
 * USAGE:
 *  - Import and use in tests that need to validate reader page content, titles, or text elements.
 *  - Essential for text verification and content validation in reading-related test scenarios.
 * ──────────────────────────────────────────────────────────────
 */

import type { Browser } from 'webdriverio';
import { DYNAMIC_ERRORS, STATIC_ERRORS, logError, SELECTORS } from '../constants';

/**
 * Checks if the TextView title inside the ScrollView has the given text.
 * @param client - WebdriverIO browser instance.
 * @param expectedText - The text to check for in the TextView.
 * @throws Will throw an error if the text doesn't match exactly
 */
export async function verifyExactTitle(client: Browser, expectedText: string): Promise<void> {
  try {
    const scrollView = await client.$(SELECTORS.READER_SELECTORS.scrollView);
    await scrollView.waitForDisplayed().then(() => true).catch(() => false);
    if (await scrollView.isDisplayed()) {
      const textView = await scrollView.$(SELECTORS.READER_SELECTORS.titleTextView);
      await textView.waitForDisplayed();

      const actualText = await textView.getText();

      if (actualText === expectedText) {
        console.debug(`MATCH: Found Title text: "${actualText}" Expected Title Text: "${expectedText}"`);
      } else {
        throw new Error(DYNAMIC_ERRORS.titleMismatch(expectedText, actualText));
      }
    } else {
      throw new Error(logError(STATIC_ERRORS.SCROLLVIEW_NOT_AVAILABLE));
    }
  } catch (error) {
    throw new Error(DYNAMIC_ERRORS.errorCheckingTitle(expectedText, error));
  }
}

/**
 * Checks if the TextView title inside the ScrollView contains the given text.
 * @param client - WebdriverIO browser instance.
 * @param expectedText - The text to check for in the TextView.
 * @throws Will throw an error if the text is not found
 */
export async function verifyTitleContains(client: Browser, expectedText: string): Promise<void> {
  try {
    const scrollView = await client.$(SELECTORS.READER_SELECTORS.scrollView);
    await scrollView.waitForDisplayed();
    if (await scrollView.isDisplayed()) {
      const textView = await scrollView.$(SELECTORS.READER_SELECTORS.titleTextView);
      await textView.waitForDisplayed();

      const actualText = await textView.getText();
      console.debug(`Found text: "${actualText}"`);

      if (actualText.includes(expectedText)) {
        console.debug(`Text contains expected: "${expectedText}"`);
      } else {
        throw new Error(DYNAMIC_ERRORS.titleMismatch(expectedText, actualText));
      }
    } else {
      throw new Error(logError(STATIC_ERRORS.SCROLLVIEW_NOT_AVAILABLE));
    }
  } catch (error) {
    throw new Error(DYNAMIC_ERRORS.errorCheckingTitle(expectedText, error));
  }
}

/**
 * Clicks the back button on the reader page.
 * @param client - WebdriverIO browser instance.
 * @throws Will throw an error if the back button is not found or clickable
 */
export async function clickBackButton(client: Browser): Promise<void> {
  try {
    const backButton = await client.$(SELECTORS.READER_SELECTORS.backButton);
    await backButton.waitForDisplayed();
    await backButton.click();
    console.debug('Back button clicked successfully');
  } catch (error) {
    throw new Error(DYNAMIC_ERRORS.errorClickingElement('back button', error));
  }
}



/**
 * Checks if the accessibilityString (expected text) appears on the visible page through the Accessibility ID (Used for finding text on reader page)
 * @param client - WebdriverIO browser instance.
 * @param accessibilityString - The accessibility id (content-desc) to look for.
 * @param isEnglish - Lets function know we are using English for invisible unicode values
 * @returns true if the text is found, otherwise throws an error.
 */
export async function findTextByAccessibilityId(client: Browser, accessibilityString: string, isEnglish: boolean = false): Promise<boolean> {
  try {
    // Need to add invisible left-to-right character for english text
    if (isEnglish) {
      accessibilityString = SELECTORS.ACCESSIBILITY_PATTERNS.englishTextPrefix + accessibilityString;
    }
    const textID = await client.$(SELECTORS.READER_SELECTORS.textByAccessibilityId(accessibilityString));    
    if (!(await textID.isExisting())) {
      throw new Error(DYNAMIC_ERRORS.accessibilityIdNotFound(accessibilityString));
    }
    console.debug(`ViewGroup with accessibility id "${accessibilityString}" found.`);
    return true;
  } catch (error) {
    throw new Error(DYNAMIC_ERRORS.errorCheckingAccessibilityId(accessibilityString, error));
  }
}

