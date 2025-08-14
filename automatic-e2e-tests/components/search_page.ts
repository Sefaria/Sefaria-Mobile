/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Interact and Validate Search Functionality on Search Screen
 * 
 * DESCRIPTION:
 *  - Provides functions to interact with the search bar and select items from search results.
 *  - Simulates user input and validates search functionality.
 * USAGE:
 *  - Import and use in tests that require searching and selecting content.
 * ──────────────────────────────────────────────────────────────
 */


import type { Browser } from 'webdriverio';
import { Selectors } from '../constants';
import { HelperFunctions } from '../utils';

/**
 * Types into the search bar character by character with a delay to simulate real user input.
 * @param client - WebdriverIO browser instance.
 * @param text - The text to type into the search bar.
 * @throws Will throw an error if the search bar is not displayed.
 * @returns boolean indicating success.
 */
export async function typeIntoSearchBar(client: Browser, text: string): Promise<boolean> {
  const searchBarSelector = Selectors.BASE_SELECTORS.editText()
  
  // Wait for the search bar to be visible and click it
  const searchBar = await client.$(searchBarSelector);
  await HelperFunctions.ensureElementDisplayed(searchBar, 'Search Bar');
  await searchBar.click();

  // Clear any existing text in the search bar
  await searchBar.clearValue();

  await searchBar.setValue(text)

  // Debug log
  const value = await searchBar.getText();
  console.debug('Search field now contains:', value);
  return true;

}


/**
 * Selects an item from a list inside a ScrollView based on its text.
 * @param client WebdriverIO browser instance
 * @param text The text of the item to select
 * @throws Will throw an error if the item is not found or not clickable
 * @returns boolean indicating success
 */
export async function selectFromList(client: Browser, text: string): Promise<boolean> {
  const scrollView = await client.$(Selectors.BASE_SELECTORS.scrollView());
  const textViewSelector = Selectors.SEARCH_SELECTORS.exactText(text);
  // Do checks to ensure the scrollView and item are displayed
  await HelperFunctions.ensureElementDisplayed(scrollView, 'ScrollView');
  const item = await scrollView.$(textViewSelector);
  await HelperFunctions.ensureElementDisplayed(item, `Item with text "${text}"`);
  
  // Retrieve the text of the item before clicking
  let item_text = await item.getText();
  await item.click();
  console.debug(`Item with text "${item_text}" clicked!`);
  return true;
}


/**
 * Verifies that the search bar is empty by checking the presence of the empty search bar selector.
 * @param client WebdriverIO browser instance
 * @throws Will throw an error if the empty search bar is not displayed
 * @returns boolean indicating success
 */
export async function verifyEmptySearchBar(client: Browser): Promise<boolean> {
  const emptySearchBar = await client.$(Selectors.SEARCH_SELECTORS.emptySearchBar);
  await HelperFunctions.ensureElementDisplayed(emptySearchBar, 'Empty Search Bar');
  
  console.debug('Empty search bar is displayed as expected.');
  return true;
}


/**
 * Clicks the 'X' button to clear the search bar.
 * @param client WebdriverIO browser instance
 * @throws Will throw an error if the clear button is not displayed or not clickable
 * @returns boolean indicating success
 */
export async function clearSearchBar(client: Browser): Promise<boolean> {
  const clearButtonSelector = Selectors.SEARCH_SELECTORS.clearSearchBar;
  const clearButton = await client.$(clearButtonSelector);
  await HelperFunctions.ensureElementDisplayed(clearButton, 'Clear Search Bar Button');
  
  // Click the clear button to clear the search bar
  await clearButton.click();
  console.debug('Clear search bar button clicked.');
  return true;
}
