/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Offline Popup Utilities for Testing Framework
 * 
 * DESCRIPTION:
 *  - Helper functions to detect and interact with offline popups in the app.
 * USAGE:
 *  - Used in tests to handle network/offline dialogs.
 * ──────────────────────────────────────────────────────────────
 */


import type { Browser } from 'webdriverio';
import { ELEMENT_TIMEOUTS, SELECTORS } from '../constants';

/**
 * Waits for the popup with resource-id "org.sefaria.sefaria:id/action_bar_root" to appear within a timeout.
 * Uses centralized selector for the offline popup container.
 * @param client WebdriverIO browser instance
 * @param timeout Timeout in milliseconds (default: POPUP_WAIT) Needs timeout as the popup could not be visible
 * @returns true if the popup appears, false otherwise
 */
export async function waitForOfflinePopUp(client: Browser, timeout: number = ELEMENT_TIMEOUTS.POPUP_WAIT): Promise<boolean> {
  try {
    const element = await client.$(SELECTORS.OFFLINE_POPUP_SELECTORS.popupContainer);
    await element.waitForDisplayed({ timeout });
    console.debug('Popup is visible!');
    return true;
  } catch {
    console.log('Popup not visible! If tests fail later, check if app even loaded.');
    return false;
  }
}

/**
 * Clicks the "NOT NOW" button if it appears.
 * Uses centralized selector for the NOT NOW button.
 * @param client WebdriverIO browser instance
 */
export async function clickNotNowIfPresent(client: Browser): Promise<void> {
  const notNowButton = await client.$(SELECTORS.OFFLINE_POPUP_SELECTORS.notNowButton);

  if (await notNowButton.isDisplayed()) {
    await notNowButton.click();
    console.debug('"NOT NOW" button clicked!');
  }
  else {
    console.log('"NOT NOW" button not present.');
  }

}

/**
 * Clicks the "OK" button if it appears.
 * Uses centralized selector for the OK button.
 * @param client WebdriverIO browser instance
 */
export async function clickOkIfPresent(client: Browser): Promise<void> {
  const okButton = await client.$(SELECTORS.OFFLINE_POPUP_SELECTORS.okButton);

  if (await okButton.isDisplayed()) {
    await okButton.click();
    console.debug('"OK" button clicked!');
  }
  else {
    console.log('"OK" button not present.');
  }
}


/**
 * Waits for the offline pop-up and clicks "Not Now" and "OK" if present.
 * Main function to handle offline popup workflow using centralized selectors.
 * @param client WebdriverIO browser instance
 * @param timeout Timeout in ms (default: POPUP_SLOW)
 */
export async function handleOfflinePopUp(client: WebdriverIO.Browser, timeout: number = ELEMENT_TIMEOUTS.POPUP_SLOW): Promise<void> {
  if (await waitForOfflinePopUp(client, timeout)) {
    await clickNotNowIfPresent(client);
    await clickOkIfPresent(client);
  }
}

