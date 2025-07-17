import type { Browser } from 'webdriverio';
import { titleMismatch, errorCheckingTitle, accessibilityIdNotFound, errorCheckingAccessibilityId, logError,  SCROLLVIEW_NOT_AVAILABLE } from '../constants/error_constants';

/**
 * Checks if the TextView title inside the ScrollView has the given text.
 * @param client - WebdriverIO browser instance.
 * @param expectedText - The text to check for in the TextView.
 * @returns true if the text matches, false otherwise.
 */
export async function checkForTitle(client: Browser, expectedText: string): Promise<boolean> {
  const scrollViewSelector = 'android=new UiSelector().className("android.widget.ScrollView").scrollable(true)';
  const textViewSelector = 'android=new UiSelector().className("android.widget.TextView").index(2)';

  try {
    const scrollView = await client.$(scrollViewSelector);
    await scrollView.waitForDisplayed({ timeout: 5000 });
    if (await scrollView.isDisplayed()) {
      const textView = await scrollView.$(textViewSelector);
      await textView.waitForDisplayed({ timeout: 5000 });

      const actualText = await textView.getText();
      console.log(`✅ Found text: "${actualText}"`);

      if (actualText === expectedText) {
        console.log(`✅ Text matches expected: "${expectedText}"`);
        return true;
      } else {
        throw new Error(titleMismatch(expectedText, actualText));
      }
    } else {
      throw new Error(logError(SCROLLVIEW_NOT_AVAILABLE));
    }
  } catch (error) {
    throw new Error(errorCheckingTitle(expectedText, error));
  }
}

/**
 * Checks if the TextView title inside the ScrollView contains the given text.
 * @param client - WebdriverIO browser instance.
 * @param expectedText - The text to check for in the TextView.
 * @returns true if the text is contained, false otherwise.
 */
export async function checkForTitleContained(client: Browser, expectedText: string): Promise<boolean> {
  const scrollViewSelector = 'android=new UiSelector().className("android.widget.ScrollView").scrollable(true)';
  const textViewSelector = 'android=new UiSelector().className("android.widget.TextView").index(2)';

  try {
    const scrollView = await client.$(scrollViewSelector);
    await scrollView.waitForDisplayed({ timeout: 8000 });
    if (await scrollView.isDisplayed()) {
      const textView = await scrollView.$(textViewSelector);
      await textView.waitForDisplayed({ timeout: 5000 });

      const actualText = await textView.getText();
      console.log(`✅ Found text: "${actualText}"`);

      if (actualText.includes(expectedText)) {
        console.log(`✅ Text contains expected: "${expectedText}"`);
        return true;
      } else {
        throw new Error(titleMismatch(expectedText, actualText));
      }
    } else {
      throw new Error(logError(SCROLLVIEW_NOT_AVAILABLE));
    }
  } catch (error) {
    throw new Error(errorCheckingTitle(expectedText, error));
  }
}



/**
 * Checks if the expectedText appears on the visible page through the Accesibility ID (Used for finding text on reader page)
 * @param client - WebdriverIO browser instance.
 * @param expectedText - The accessibility id (content-desc) to look for.
 * @param isEnglish - Lets function know we are using English for invisible unicode values
 * @returns true if the text is found, otherwise throws an error.
 */
export async function checkForTextOnPage(client: Browser, expectedText: string, isEnglish: boolean = false): Promise<boolean> {
  try {
    // Need to add invisible left-to-right character for english text
    if (isEnglish) {
      expectedText = '\u2066' + expectedText;
    }
    const textID = await client.$(`~${expectedText}`);    
    if (!(await textID.isExisting())) {
      throw new Error(accessibilityIdNotFound(expectedText));
    }
    console.log(`✅ ViewGroup with accessibility id "${expectedText}" found.`);
    return true;
  } catch (error) {
    throw new Error(errorCheckingAccessibilityId(expectedText, error));
  }
}
