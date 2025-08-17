/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Interaction Helpers for Display Settings in Sefaria App
 * 
 * DESCRIPTION:
 *  - Provides functions to open/close the display settings and toggle language in the Sefaria app.
 *  - Used to automate UI interactions related to display and language preferences.
 * USAGE:
 *  - Import and use in tests or other components that require changing display or language settings.
 * ──────────────────────────────────────────────────────────────
 */



import type { Browser } from 'webdriverio';
import { Selectors } from '../constants';
import { HelperFunctions } from '../utils';

/**
 * toggle the display settings open and close.
 * Used before operating actions on the display settings
 * @param client - WebdriverIO browser instance.
 * @throws Will throw an error if the display settings button is not displayed
 * @returns boolean indicating success
 */
export async function toggleDisplaySettings(client: Browser): Promise<boolean> {
  const displaySettingsButton = await client.$(Selectors.DisplaySettings_SELECTORS.openButton);
  await HelperFunctions.ensureElementDisplayed(displaySettingsButton, 'Display Settings Button');
  await displaySettingsButton.click();
  console.debug('Opened display settings.');
  return true;
}

/**
 * Press the toggle language button (switches certain content on page from English to Hebrew and vice versa)
 * @param client - WebdriverIO browser instance.
 * @param isEnglish - Current language state; true if English, false if Hebrew.
 * @throws Will throw an error if the toggle language button is not displayed
 * @return boolean indicating success
 */
export async function toggleLanguageButton(client: Browser, isEnglish: boolean = true): Promise<boolean> {
  // Determine the description based on the current language
  const targetLanguage = isEnglish ? "Hebrew" : "English";
  const selector = Selectors.DISPLAY_SETTINGS.languageToggle(targetLanguage);

  // Find and click the toggle language button
  const toggleLanguageButton = await client.$(selector);
  await HelperFunctions.ensureElementDisplayed(toggleLanguageButton, `Toggle Language Button for ${targetLanguage}`);
  await toggleLanguageButton.click();
  console.debug(`Pressed toggle language button: switching to ${targetLanguage}.`);
  return true;
}