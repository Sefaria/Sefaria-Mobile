import type { Browser } from 'webdriverio';
import { DYNAMIC_ERRORS, STATIC_ERRORS, logError } from '../constants/error_constants';
import { READER_SELECTORS, ACCESSIBILITY_PATTERNS } from '../constants/selectors';
import { OPERATION_TIMEOUTS } from '../constants/timeouts';

/**
 * Checks if the TextView title inside the ScrollView has the given text.
 * @param client - WebdriverIO browser instance.
 * @param expectedText - The text to check for in the TextView.
 * @returns true if the text matches, false otherwise.
 */
export async function verifyExactTitle(client: Browser, expectedText: string): Promise<boolean> {
  try {
    const scrollView = await client.$(READER_SELECTORS.scrollView);
    await scrollView.waitForDisplayed({ timeout: OPERATION_TIMEOUTS.READER_TITLE_LOAD });
    if (await scrollView.isDisplayed()) {
      const textView = await scrollView.$(READER_SELECTORS.titleTextView);
      await textView.waitForDisplayed({ timeout: OPERATION_TIMEOUTS.READER_TITLE_LOAD });

      const actualText = await textView.getText();
      console.debug(`Found text: "${actualText}"`);

      if (actualText === expectedText) {
        console.debug(`Text matches expected: "${expectedText}"`);
        return true;
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
 * @returns true if the text is contained, false otherwise.
 */
export async function verifyTitleContains(client: Browser, expectedText: string): Promise<boolean> {
  try {
    const scrollView = await client.$(READER_SELECTORS.scrollView);
    await scrollView.waitForDisplayed({ timeout: OPERATION_TIMEOUTS.READER_CONTENT_LOAD });
    if (await scrollView.isDisplayed()) {
      const textView = await scrollView.$(READER_SELECTORS.titleTextView);
      await textView.waitForDisplayed({ timeout: OPERATION_TIMEOUTS.READER_TITLE_LOAD });

      const actualText = await textView.getText();
      console.debug(`Found text: "${actualText}"`);

      if (actualText.includes(expectedText)) {
        console.debug(`Text contains expected: "${expectedText}"`);
        return true;
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
      accessibilityString = ACCESSIBILITY_PATTERNS.englishTextPrefix + accessibilityString;
    }
    const textID = await client.$(READER_SELECTORS.textByAccessibilityId(accessibilityString));    
    if (!(await textID.isExisting())) {
      throw new Error(DYNAMIC_ERRORS.accessibilityIdNotFound(accessibilityString));
    }
    console.debug(`ViewGroup with accessibility id "${accessibilityString}" found.`);
    return true;
  } catch (error) {
    throw new Error(DYNAMIC_ERRORS.errorCheckingAccessibilityId(accessibilityString, error));
  }
}

