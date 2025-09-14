/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Offline Popup Utilities for Testing Framework
 * 
 * DESCRIPTION:
 *  - Helper functions to detect and interact with popups in the app.
 * USAGE:
 *  - Used in tests to handle network/offline dialogs.
 * ──────────────────────────────────────────────────────────────
 */


import type { Browser } from 'webdriverio';
import { ELEMENT_TIMEOUTS, Selectors } from '../constants';

/**
 * Waits for the offline pop-up to appear within a specified timeout.
 * @param client WebdriverIO browser instance
 * @param timeout Timeout in milliseconds (default: POPUP_WAIT) Needs timeout as the popup could not be visible
 * @returns true if the popup appears, false otherwise
 */
export async function waitForOfflinePopUp(client: Browser, timeout: number = ELEMENT_TIMEOUTS.POPUP_WAIT, log: boolean=true): Promise<boolean> {
  try {
    const element = await client.$(Selectors.OFFLINE_POPUP_SELECTORS.popupContainer);
    await element.waitForDisplayed({ timeout });
    console.debug('Offline Popup is visible!');
    return true;
  } catch {
    if (log) {
      console.log('[WARNING] Offline Popup not visible! If tests fail later, check if app even loaded.');
    }
    return false;
  }
}

/**
 * Clicks the "NOT NOW" button if it appears.
 * Uses centralized selector for the NOT NOW button.
 * @param client WebdriverIO browser instance
 */
export async function clickNotNowIfPresent(client: Browser): Promise<void> {
  const notNowButton = await client.$(Selectors.OFFLINE_POPUP_SELECTORS.notNowButton);

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
  const okButton = await client.$(Selectors.OFFLINE_POPUP_SELECTORS.okButton);

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

/**
 * Checks if the popup is present on screen.
 * @param client WebdriverIO browser instance
 * @returns true if the popup close button is displayed and popup hasn't appeared yet, false otherwise
 */
export async function isPopUpPresent(client: Browser): Promise<boolean> {
  try {
    const selector = Selectors.DISPLAY_SETTINGS.closePopUp;
    console.debug(`Checking for pop-up presence (${selector})  ${new Date().toISOString()}`);
    const closeBtn = await client.$(selector);
    return await closeBtn.isDisplayed();
  } catch (err) {
    return false;
  }
}

/**
 * Closes the popup by clicking the close button.
 * @param client WebdriverIO browser instance
 */
export async function closePopUp(client: Browser): Promise<boolean> {
    try {
      const selector = Selectors.DISPLAY_SETTINGS.closePopUp;
      const closeBtn = await client.$(selector);
      console.debug(`Attempting to close pop-up (${selector})  ${new Date().toISOString()}`);
      await closeBtn.click();
      console.debug(`Close pop-up button clicked (${selector})  ${new Date().toISOString()}`);
      return true;
    } catch (err) {
      // element not present — should not have been used without isPopUpPresent check
      console.debug('Pop Up could not be closed');
      return false;
    }

}

/**
 * Global popup monitor that runs in the background
 */
let popupMonitorRunning = false;
let popupMonitorInterval: NodeJS.Timeout | null = null;

/**
 * Starts a Global background monitor that continuously checks for and closes popups
 * This runs automatically and handles ALL types of popups (add more as needed)
 * @param client WebdriverIO browser instance
 */
export async function startGlobalPopupMonitor(client: Browser): Promise<void> {
  if (popupMonitorRunning) {
    console.log('[POPUP MONITOR] Already running');
    return;
  }

  console.log('[POPUP MONITOR] Starting CONTINUOUS popup monitoring...\n');
  popupMonitorRunning = true;
  let foundDonationPopup = false;
  let isChecking = false; // New: Lock to prevent concurrent checks

  popupMonitorInterval = setInterval(async () => {
    // New: Skip if already checking or popup already handled
    if (isChecking || foundDonationPopup) {
      return;
    }

    isChecking = true; // Lock the check
    try {
      // Check for donation/generic popup
      if (await isPopUpPresent(client)) {
        foundDonationPopup = true;
        console.debug(`[POPUP MONITOR] Found donation popup! ${new Date().toISOString()}`);
        await closePopUp(client); // Close immediately after detection
        console.debug(`[POPUP MONITOR] Popup handled for donation! Stopped checking donation Popup.`);
      }
    } catch (error) {
      // Ignore errors - they're expected when no popup is present
      console.debug('[POPUP MONITOR] Check completed (no popup found)');
    } finally {
      isChecking = false; // Unlock after check completes
    }
  }, 250); // Check every .25 seconds (needed to close it fast)
}

/**
 * Stops the background popup monitor.
 * Usually used after a test suite is done
 */
export function stopGlobalPopupMonitor(): void {
  if (popupMonitorInterval) {
    clearInterval(popupMonitorInterval);
    popupMonitorInterval = null;
  }
  popupMonitorRunning = false;
  console.log('[POPUP MONITOR] Stopped');
}
