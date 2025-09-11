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

// Pop up only appears once per session, so do not check again if already appeared
// This avoids unnecessary waits in tests where no popup appears
// (e.g., if app is online or popup already handled)
let POPUPAPPEARD = false;
/**
 * Safe-close the "X" (donate / generic popup close) button if present.
 * @param client WebdriverIO browser instance
 * @return true if a popup was found and closed, false otherwise
 */
export async function closePopUpIfPresent(client: Browser): Promise<boolean> {
  if (!POPUPAPPEARD) {
    try {
      const selector = Selectors.DISPLAY_SETTINGS.closePopUp;
      const closeBtn = await client.$(selector);
      if (await closeBtn.isDisplayed()) {
        await closeBtn.click();
        console.debug(`Close pop-up button clicked (${selector})`);
        POPUPAPPEARD = true;
        return true;
      }
    } catch (err) {
      // element not present — ignore
    }
    return false;
  } else {
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

  console.log('[POPUP MONITOR] Starting CONTINUOUS popup monitoring...');
  popupMonitorRunning = true;
  let foundDonationPopup = false;
  let currentAction = '';

  popupMonitorInterval = setInterval(async () => {
    try {
      // Check for donation/generic popup
      if (!foundDonationPopup) {
        if (await closePopUpIfPresent(client)) {
          console.debug('[POPUP MONITOR] Found and closed donation popup!');
          foundDonationPopup = true;
          currentAction = 'donation';
        }
      }

      if (foundDonationPopup && currentAction) {
          console.debug(`[POPUP MONITOR] Popup handled for ${currentAction}! Stopped checking ${currentAction} Popup.`);
          currentAction = '';
      }
    } catch (error) {
      // Ignore errors - they're expected when no popup is present
      console.debug('[POPUP MONITOR] Check completed (no popup found)');
    }
  }, 1500); // Check every 1.5 seconds
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
