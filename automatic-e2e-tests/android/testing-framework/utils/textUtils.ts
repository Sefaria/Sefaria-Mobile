import type { Browser, ChainablePromiseElement } from 'webdriverio';
import { textNotFound, ELEMENT_NOT_VISIBLE, logError } from '../utils/constants';
import { escapeForRegex } from '../utils/helper_functions';


// Functions to help locate Text on Page

/**
 * Checks if a TextView with the exact given text is present on the page.
 * Used for quick verification of UI state.
 * @param client WebdriverIO browser instance
 * @param text The exact text to look for
 * @returns Promise<ChainablePromiseElement> the text element if found
 */
export async function isTextOnPage(client: Browser, text: string): Promise<ChainablePromiseElement> {
  const selector = `android=new UiSelector().className("android.widget.TextView").packageName("org.sefaria.sefaria").text("${escapeForRegex(text)}")`;
  const element = await client.$(selector);
  const isDisplayed = await element.waitForDisplayed({ timeout: 4000 }).catch(() => false);
  if (isDisplayed) {
    console.log(`✅ Text '${text}' is present on the page!`);
    return element;
  } else {
    throw new Error(textNotFound(text));
  }
}

/**
 * Checks if a TextView containing the given text is present on the page.
 * Used for less strict verification (substring match).
 * @param client WebdriverIO browser instance
 * @param text The text to look for (substring match)
 * @returns Promise<ChainablePromiseElement> the text element if found
 */
export async function isTextContainedOnPage(client: Browser, text: string): Promise<ChainablePromiseElement> {
  const selector = `android=new UiSelector().className("android.widget.TextView").packageName("org.sefaria.sefaria").textContains("${escapeForRegex(text)}")`;
  const element = await client.$(selector);
  const isDisplayed = await element.waitForDisplayed({ timeout: 4000 }).catch(() => false);
  if (isDisplayed) {
    console.log(`✅ Text containing '${text}' is present on the page! Found text: '${await element.getText()}'`);
    return element;
  } else {
    throw new Error(textNotFound(text));
  }
}

/**
 * Checks for a header with the given text in the first ViewGroup element and throws if not found.
 * @param client WebdriverIO browser instance
 * @param headerText The header text to check for (e.g., "Explore by Topic")
 * @returns Promise<ChainablePromiseElement> The header element if found
 */
export async function checkForHeader(client: Browser, headerText: string): Promise<ChainablePromiseElement> {
  // Find the first ViewGroup
  const viewGroupSelector = 'android=new UiSelector().className("android.view.ViewGroup").packageName("org.sefaria.sefaria").index(0)';
  const viewGroup = await client.$(viewGroupSelector);
  const isViewGroupDisplayed = await viewGroup.waitForDisplayed({ timeout: 1000 }).catch(() => false);
  if (!isViewGroupDisplayed) {
    throw new Error(logError(ELEMENT_NOT_VISIBLE + ' (first ViewGroup)'));
  }
  // Find the TextView with the header text inside the ViewGroup
  const headerSelector = `android=new UiSelector().className("android.widget.TextView").packageName("org.sefaria.sefaria").textContains("${escapeForRegex(headerText)}")`;
  const header = await viewGroup.$(headerSelector);
  const isHeaderDisplayed = await header.waitForDisplayed({ timeout: 1000 }).catch(() => false);
  if (!isHeaderDisplayed) {
    throw new Error(textNotFound(headerText));
  }
  console.log(`✅ Header '${headerText}' is present in the first ViewGroup!`);
  return header;
}