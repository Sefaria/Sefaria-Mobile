/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Navigation Bar Component Helpers for Testing Framework
 * 
 * DESCRIPTION:
 *  - Provides functions to interact with the app's navigation bar.
 *  - Includes helpers to wait for the navbar, click items by content-desc, and close popups.
 * USAGE:
 *  - Import and use in tests or page objects that require navigation actions or moving between pages.
 * ──────────────────────────────────────────────────────────────
 */


import type { Browser } from 'webdriverio';
import { STATIC_ERRORS, SUCCESS_MESSAGES, logError, NAVIGATION_SELECTORS, OPERATION_TIMEOUTS } from '../constants';



/**
 * Waits for the navigation bar (navbar) to be displayed.
 * @param client WebdriverIO browser instance
 */
export async function waitForNavBar(client: Browser): Promise<void> {
  const navBar = await client.$(NAVIGATION_SELECTORS.navBar);
  const isDisplayed = await navBar.waitForDisplayed({ timeout: OPERATION_TIMEOUTS.NAVBAR_WAIT }).catch(() => false);
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
 * @returns Promise<boolean> true if clicked, false otherwise
 */
export async function clickNavBarItem(client: Browser, contentDesc: string): Promise<boolean> {
  const itemSelector = NAVIGATION_SELECTORS.navBarItem(contentDesc);
  const item = await client.$(itemSelector);
  const isDisplayed = await item.waitForDisplayed({ timeout: OPERATION_TIMEOUTS.NAVBAR_WAIT }).catch(() => false);
  if (isDisplayed) {
    await item.click();
    console.debug(`Clicked nav bar item: ${contentDesc}`);
    return true;
  } else {
    throw new Error(logError(STATIC_ERRORS.ELEMENT_NOT_VISIBLE + ` (nav bar item: ${contentDesc})`));
  }
}

/**
 * Clicks the close button on a pop-up if it is visible.
 * @param client WebdriverIO browser instance
 * @returns Promise<boolean> true if clicked, false otherwise
 */
export async function closePopUp(client: Browser): Promise<void> {
  const closeBtn = await client.$(NAVIGATION_SELECTORS.closePopup);
  const isDisplayed = await closeBtn.waitForDisplayed({ timeout: OPERATION_TIMEOUTS.POPUP_CLOSE }).catch(() => false);
  if (isDisplayed) {
    await closeBtn.click();
    console.log(SUCCESS_MESSAGES.CLOSE_POPUP_SUCCESS);
  } else {
    throw new Error(logError(STATIC_ERRORS.CLOSE_POPUP_NOT_VISIBLE));
  }
}


