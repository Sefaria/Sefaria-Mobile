/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Search Page Component Helpers for Testing Framework
 * 
 * DESCRIPTION:
 *  - Provides functions to interact with the search bar and select items from search results.
 *  - Simulates user input and validates search functionality.
 * USAGE:
 *  - Import and use in tests that require searching and selecting content.
 * ──────────────────────────────────────────────────────────────
 */


import type { Browser } from 'webdriverio';
import { SCROLLVIEW_NOT_VISIBLE, textNotFound, logError, errorSelectingItemByText } from '../constants/error_constants';

/**
 * Types into the search bar character by character with a delay to simulate real user input.
 * @param client - WebdriverIO browser instance.
 * @param text - The text to type into the search bar.
 */
export async function typeIntoSearchBar(client: Browser, text: string): Promise<void> {
  const searchBarSelector = 'android=new UiSelector().className("android.widget.EditText")';

  // Wait for the search bar to be visible
  const searchBar = await client.$(searchBarSelector);
  await searchBar.waitForDisplayed({ timeout: 5000 });
  await searchBar.click();

  // Clear any existing text in the search bar
  await searchBar.clearValue();

  await searchBar.setValue(text)

  // Debug log
  const value = await searchBar.getText();
  console.log('Search field now contains:', value);

}


/**
 * Selects an item from a list inside a ScrollView based on its text.
 * @param client WebdriverIO browser instance
 * @param text The text of the item to select
 * @returns true if the item was found and clicked, false otherwise
 */
export async function selectFromList(client: Browser, text: string): Promise<boolean> {
  const scrollViewSelector =
    'android=new UiSelector().className("android.widget.ScrollView").scrollable(true)';
  const textViewSelector = `android=new UiSelector().className("android.widget.TextView").text("${text}")`;

  try {
    const scrollView = await client.$(scrollViewSelector);
    if (await scrollView.isDisplayed()) {
      const item = await scrollView.$(textViewSelector);
      
      await item.waitForDisplayed({ timeout: 5000 });

      if (await item.isDisplayed()) {
        await item.click();
        console.log(`✅ Item with text "${text}" clicked!`);
        return true;
      } else {
        throw new Error(textNotFound(text));
      }
    } else {
      throw new Error(logError(`${SCROLLVIEW_NOT_VISIBLE} (${text} has no results in search).`));
    }
  } catch (error) {
    throw new Error(errorSelectingItemByText(text, error));
  }

  return false;
}
