/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Display Settings Component Helpers for Testing Framework
 * 
 * DESCRIPTION:
 *  - Provides functions to open/close the display settings and toggle language in the Sefaria app.
 *  - Used to automate UI interactions related to display and language preferences.
 * USAGE:
 *  - Import and use in tests or other components that require changing display or language settings.
 * ──────────────────────────────────────────────────────────────
 */



import type { Browser } from 'webdriverio';
import { ELEMENT_NOT_VISIBLE, logError } from '../constants/error_constants';

/**
 * toggle the display settings open and close.
 * Used before operating actions on the display settings
 * @param client - WebdriverIO browser instance.
 */
export async function toggleDisplaySettings(client: Browser): Promise<void> {
  const displaySettingsButton = await client.$('~Open display settings');
  const isDisplayed = await displaySettingsButton.waitForDisplayed({ timeout: 5000 }).catch(() => false);
  if (!isDisplayed) {
    throw new Error(logError(ELEMENT_NOT_VISIBLE + ' (display settings button)'));
  }
  await displaySettingsButton.click();
  console.log('✅ Opened display settings.');
}

/**
 * Press the toggle language button (switches certain content on page from English to Hebrew and vice versa)
 * @param client - WebdriverIO browser instance.
 * @param isEnglish - Current language state; true if English, false if Hebrew.
 */
export async function toggleLanguageButton(client: Browser, isEnglish: boolean = true): Promise<void> {
    // Determine the description based on the current language
    const targetLanguage = isEnglish ? "Hebrew" : "English";
    const selector = `android=new UiSelector().description("Change language to ${targetLanguage}")`;

    // Find and click the toggle language button
    const toggleLanguageButton = await client.$(selector);
    const isDisplayed = await toggleLanguageButton.waitForDisplayed({ timeout: 5000 }).catch(() => false);
    if (!isDisplayed) {
      throw new Error(logError(ELEMENT_NOT_VISIBLE + ` (toggle language button for ${targetLanguage})`));
    }
    await toggleLanguageButton.click();
    console.log(`✅ Pressed toggle language button to switch to ${targetLanguage}.`);
}