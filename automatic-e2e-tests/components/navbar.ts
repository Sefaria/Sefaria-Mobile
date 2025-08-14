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
import { STATIC_ERRORS, SUCCESS_MESSAGES, logError, Selectors } from '../constants';



/**
 * Waits for the navigation bar (navbar) to be displayed.
 * @param client WebdriverIO browser instance
 */
export async function waitForNavBar(client: Browser): Promise<void> {
  const navBar = await client.$(Selectors.NAVIGATION_SELECTORS.navBar);
  const isDisplayed = await navBar.waitForDisplayed().catch(() => false);
  if (isDisplayed) {
    console.debug('Navigation bar is displayed!');
  } else {
    throw new Error(logError(STATIC_ERRORS.NAV_BAR_NOT_DISPLAYED));
  }
}

/**
 * Clicks a navigation bar item by its content description (e.g., "Texts", "Topics", "Search", "Saved", "Account").
 * @param client WebdriverIO browser instance
 * @param contentDesc The content description of the nav bar item to click
 * @throws Will throw an error if the nav bar item is not visible
 */
export async function clickNavBarItem(client: Browser, contentDesc: string): Promise<void> {
  const itemSelector = Selectors.NAVIGATION_SELECTORS.navBarItem(contentDesc);
  const item = await client.$(itemSelector);
  const isDisplayed = await item.waitForDisplayed().catch(() => false);
  if (isDisplayed) {
    await item.click();
    console.debug(`Clicked nav bar item: ${contentDesc}`);
  } else {
    throw new Error(logError(STATIC_ERRORS.ELEMENT_NOT_VISIBLE + ` (nav bar item: ${contentDesc})`));
  }
}

/**
 * Clicks the close button on a pop-up if it is visible.
 * @param client WebdriverIO browser instance
 * @throws Will throw an error if the close button is not visible
 */
export async function closePopUp(client: Browser): Promise<void> {
  const closeBtn = await client.$(Selectors.NAVIGATION_SELECTORS.closePopUp);
  const isDisplayed = await closeBtn.waitForDisplayed().catch(() => false);
  if (isDisplayed) {
    await closeBtn.click();
    console.log(SUCCESS_MESSAGES.CLOSE_POPUP_SUCCESS);
  } else {
    throw new Error(logError(STATIC_ERRORS.CLOSE_POPUP_NOT_VISIBLE));
  }
}


