/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Interact with the Reader Page Screen
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
import { Errors, Selectors } from '../constants';
import { HelperFunctions } from '../utils';

/**
 * Checks if the TextView title inside the ScrollView has the given text.
 * @param client - WebdriverIO browser instance.
 * @param expectedText - The text to check for in the TextView.
 * @throws Will throw an error if the text doesn't match exactly
 */
export async function verifyExactTitle(client: Browser, expectedText: string): Promise<void> {
  try {
    const scrollView = await client.$(Selectors.READER_SELECTORS.scrollView);
    await HelperFunctions.ensureElementDisplayed(scrollView, 'ScrollView');
    
    const textView = await scrollView.$(Selectors.READER_SELECTORS.titleTextView);
    await HelperFunctions.ensureElementDisplayed(textView, 'Title TextView');
    
    const actualText = await textView.getText();
    
    if (actualText !== expectedText) {
      throw new Error(Errors.DYNAMIC_ERRORS.titleMismatch(expectedText, actualText));
    }
    
    console.debug(`Title text verified: Found Title text: "${actualText}" Expected Title Text: "${expectedText}"`);
  } catch (error) {
    throw new Error(Errors.DYNAMIC_ERRORS.errorCheckingTitle(expectedText, error));
  }
}

/**
 * Checks if the TextView title inside the ScrollView contains the given text.
 * @param client - WebdriverIO browser instance.
 * @param expectedText - The text to check for in the TextView.
 * @throws Will throw an error if the text is not found
 * @returns boolean indicating success
 */
export async function verifyTitleContains(client: Browser, expectedText: string): Promise<boolean> {
  const scrollView = await client.$(Selectors.READER_SELECTORS.scrollView);
  await HelperFunctions.ensureElementDisplayed(scrollView, 'ScrollView');
  
  const textView = await scrollView.$(Selectors.READER_SELECTORS.titleTextView);
  await HelperFunctions.ensureElementDisplayed(textView, 'Title TextView');
  
  const actualText = await textView.getText();
  console.debug(`Found text: "${actualText}"`);
  
  if (!actualText.includes(expectedText)) {
    throw new Error(Errors.DYNAMIC_ERRORS.titleMismatch(expectedText, actualText));
  }
  
  console.debug(`Text contains expected: "${expectedText}"`);
  return true;
}

/**
 * Clicks the back button on the reader page.
 * @param client - WebdriverIO browser instance.
 * @throws Will throw an error if the back button is not found or clickable
 * @returns boolean indicating success
 */
export async function clickBackButton(client: Browser): Promise<boolean> {
  try {
    const backButton = await client.$(Selectors.READER_SELECTORS.backButton);
    await HelperFunctions.ensureElementDisplayed(backButton, 'Back button');
    await backButton.click();
    console.debug('Back button clicked successfully');
    return true;
  } catch (error) {
    throw new Error(Errors.DYNAMIC_ERRORS.errorClickingElement('back button', error));
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
    const finalAccessibilityString = isEnglish 
      ? Selectors.ACCESSIBILITY_PATTERNS.englishTextPrefix + accessibilityString
      : accessibilityString;
    
    const textID = await client.$(Selectors.READER_SELECTORS.textByAccessibilityId(finalAccessibilityString));
    
    const exists = await textID.isExisting();
    if (!exists) {
      throw new Error(Errors.DYNAMIC_ERRORS.accessibilityIdNotFound(finalAccessibilityString));
    }
    
    console.debug(`ViewGroup with accessibility id "${finalAccessibilityString}" found.`);
    return true;
  } catch (error) {
    throw new Error(Errors.DYNAMIC_ERRORS.errorCheckingAccessibilityId(accessibilityString, error));
  }
}