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

/**
 * Waits for the popup with resource-id "org.sefaria.sefaria:id/action_bar_root" to appear within a timeout.
 * Timeout is included because sometimes the popup may not be visible immediately.
 * @param client WebdriverIO browser instance
 * @param timeout Timeout in milliseconds (default: 5000) Needs timeout as the popup could not be visible
 * @returns true if the popup appears, false otherwise
 */
export async function waitForOfflinePopUp(client: Browser, timeout = 5000): Promise<boolean> {
  const selector =
    'android=new UiSelector().resourceId("org.sefaria.sefaria:id/action_bar_root").className("android.widget.FrameLayout")';
  try {
    const element = await client.$(selector);
    await element.waitForDisplayed({ timeout });
    console.log('✅ Popup is visible!');
    return true;
  } catch {
    console.log('ℹ️ Popup not visible!');
    return false;
  }
}

/**
 * Clicks the "NOT NOW" button if it appears.
 * @param client WebdriverIO browser instance
 */
export async function clickNotNowIfPresent(client: Browser): Promise<void> {
  const notNowSelector =
    'android=new UiSelector().resourceId("android:id/button1").text("NOT NOW").className("android.widget.Button")';
  const notNowButton = await client.$(notNowSelector);

  if (await notNowButton.isDisplayed()) {
    await notNowButton.click();
    console.log('✅ "NOT NOW" button clicked!');
  }
  else {
    console.log('ℹ️ "NOT NOW" button not present.');
  }

}

/**
 * Clicks the "OK" button if it appears.
 * @param client WebdriverIO browser instance
 */
export async function clickOkIfPresent(client: Browser): Promise<void> {
  const okSelector =
    'android=new UiSelector().resourceId("android:id/button1").text("OK").className("android.widget.Button")';
  const okButton = await client.$(okSelector);

  if (await okButton.isDisplayed()) {
    await okButton.click();
    console.log('✅ "OK" button clicked!');
  }
  else {
    console.log('ℹ️ "OK" button not present.');
  }
}


/**
 * Waits for the offline pop-up and clicks "Not Now" and "OK" if present.
 * @param client WebdriverIO browser instance
 * @param timeout Timeout in ms (default: 15000)
 */
export async function handleOfflinePopUp(client: WebdriverIO.Browser, timeout = 15000): Promise<void> {
  if (await waitForOfflinePopUp(client, timeout)) {
    await clickNotNowIfPresent(client);
    await clickOkIfPresent(client);
  }
}

