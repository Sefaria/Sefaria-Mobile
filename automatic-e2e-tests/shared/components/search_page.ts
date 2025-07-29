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
import { STATIC_ERRORS, DYNAMIC_ERRORS, logError, SELECTORS } from '../constants';

/**
 * Types into the search bar character by character with a delay to simulate real user input.
 * @param client - WebdriverIO browser instance.
 * @param text - The text to type into the search bar.
 */
export async function typeIntoSearchBar(client: Browser, text: string): Promise<void> {
  const searchBarSelector = SELECTORS.BASE_SELECTORS.editText()
  
  // Wait for the search bar to be visible
  const searchBar = await client.$(searchBarSelector);
  await searchBar.waitForDisplayed();
  await searchBar.click();

  // Clear any existing text in the search bar
  await searchBar.clearValue();

  await searchBar.setValue(text)

  // Debug log
  const value = await searchBar.getText();
  console.log('[INFO] Search field now contains:', value);

}


/**
 * Selects an item from a list inside a ScrollView based on its text.
 * @param client WebdriverIO browser instance
 * @param text The text of the item to select
 * @throws Will throw an error if the item is not found or not clickable
 */
export async function selectFromList(client: Browser, text: string): Promise<void> {
  const scrollView = await client.$(SELECTORS.BASE_SELECTORS.scrollView());
  const textViewSelector = SELECTORS.TEXT_SELECTORS.exactText(text);

  // Wait for the scroll view to be visible
  const isScrollViewVisible = await scrollView.isDisplayed();
  if (!isScrollViewVisible) {
    throw new Error(logError(`${STATIC_ERRORS.SCROLLVIEW_NOT_VISIBLE} (${text} has no results in search).`));
  }

  const item = await scrollView.$(textViewSelector);
  await item.waitForDisplayed();

  if (await item.isDisplayed()) {
    await item.click();
    console.debug(`Item with text "${text}" clicked!`);
  } else {
    throw new Error(DYNAMIC_ERRORS.textNotFound(text));
  }
}
