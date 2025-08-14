/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Interactions with Navigation Bar Footer on any screen
 * 
 * DESCRIPTION:
 *  - Provides functions to interact with the app's navigation bar.
 *  - Includes helpers to wait for the navbar, click items by content-desc, and close popups.
 * USAGE:
 *  - Import and use in tests or page objects that require navigation actions or moving between pages.
 * ──────────────────────────────────────────────────────────────
 */


import type { Browser } from 'webdriverio';
import { SUCCESS_MESSAGES, Selectors } from '../constants';
import { HelperFunctions } from '../utils';


/**
 * Waits for the navigation bar (navbar) to be displayed.
 * @param client WebdriverIO browser instance
 * @throws Will throw an error if the navbar is not displayed
 * @returns boolean indicating success
 */
export async function waitForNavBar(client: Browser): Promise<boolean> {
  const navBar = await client.$(Selectors.NAVIGATION_SELECTORS.navBar);
  await HelperFunctions.ensureElementDisplayed(navBar, 'Navigation Bar');
  return true;
}

/**
 * Clicks a navigation bar item by its content description (e.g., "Texts", "Topics", "Search", "Saved", "Account").
 * @param client WebdriverIO browser instance
 * @param contentDesc The content description of the nav bar item to click
 * @throws Will throw an error if the nav bar item is not visible
 * @returns boolean indicating success
 */
export async function clickNavBarItem(client: Browser, contentDesc: string): Promise<boolean> {
  const itemSelector = Selectors.NAVIGATION_SELECTORS.navBarItem(contentDesc);
  const item = await client.$(itemSelector);
  await HelperFunctions.ensureElementDisplayed(item, `Nav Bar Item: ${contentDesc}`);
  // Click the item
  await item.click();
  console.debug(`Clicked nav bar item: ${contentDesc}`);
  return true;
}

/**
 * Clicks the close button on a pop-up if it is visible.
 * @param client WebdriverIO browser instance
 * @throws Will throw an error if the close button is not visible
 */
export async function closePopUp(client: Browser): Promise<void> {
  const closeBtn = await client.$(Selectors.NAVIGATION_SELECTORS.closePopUp);
  await HelperFunctions.ensureElementDisplayed(closeBtn, 'Close PopUp Button');
  await closeBtn.click();
  console.log(SUCCESS_MESSAGES.CLOSE_POPUP_SUCCESS);
}


