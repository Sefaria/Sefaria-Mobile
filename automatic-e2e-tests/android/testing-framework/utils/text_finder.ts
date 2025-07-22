/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Text and Element Finder Utilities for Testing Framework
 * 
 * DESCRIPTION:
 *  - Helper functions to locate and interact with text and elements by text or content-desc.
 *  - Includes strict and substring matching, header checks, and content-desc utilities.
 * USAGE:
 *  - Used in tests and page objects for robust element selection.
 * ──────────────────────────────────────────────────────────────
 */


import type { Browser, ChainablePromiseElement } from 'webdriverio';
import { textNotFound, ELEMENT_NOT_VISIBLE, logError, elementNameNotFound } from '../constants/error_constants';
import { escapeForRegex } from './helper_functions';
import { TEXT_SELECTORS, TOPICS_SELECTORS } from '../constants/selectors';
import { ELEMENT_TIMEOUTS } from '../constants/timeouts';


// Functions to help locate Text on Page

/**
 * Finds and returns a TextView element with the exact given text if present on the page.
 * Used for quick verification of UI state.
 * @param client WebdriverIO browser instance
 * @param text The exact text to look for
 * @returns Promise<ChainablePromiseElement> the text element if found
 */
export async function findTextElement(client: Browser, text: string): Promise<ChainablePromiseElement> {
  const selector = TEXT_SELECTORS.exactText(escapeForRegex(text));
  const element = await client.$(selector);
  const isDisplayed = await element.waitForDisplayed({ timeout: ELEMENT_TIMEOUTS.STANDARD }).catch(() => false);
  if (isDisplayed) {
    console.log(`✅ Text '${text}' is present on the page!`);
    return element;
  } else {
    throw new Error(textNotFound(text));
  }
}

/**
 * Finds and returns a TextView element containing the given text if present on the page.
 * Used for less strict verification (substring match).
 * @param client WebdriverIO browser instance
 * @param text The text to look for (substring match)
 * @returns Promise<ChainablePromiseElement> the text element if found
 */
export async function findTextContaining(client: Browser, text: string): Promise<ChainablePromiseElement> {
  const selector = TEXT_SELECTORS.containsText(escapeForRegex(text));
  const element = await client.$(selector);
  const isDisplayed = await element.waitForDisplayed({ timeout: ELEMENT_TIMEOUTS.STANDARD }).catch(() => false);
  if (isDisplayed) {
    console.log(`✅ Text containing '${text}' is present on the page! Found text: '${await element.getText()}'`);
    return element;
  } else {
    throw new Error(textNotFound(text));
  }
}

/**
 * Finds and verifies a header with the given text in the first ViewGroup element.
 * @param client WebdriverIO browser instance
 * @param headerText The header text to check for (e.g., "Explore by Topic")
 * @returns Promise<ChainablePromiseElement> The header element if found
 */
export async function findHeaderInFirstViewGroup(client: Browser, headerText: string): Promise<ChainablePromiseElement> {
  // Find the first ViewGroup
  const viewGroup = await client.$(TOPICS_SELECTORS.firstViewGroup);
  const isViewGroupDisplayed = await viewGroup.waitForDisplayed({ timeout: ELEMENT_TIMEOUTS.QUICK_CHECK }).catch(() => false);
  if (!isViewGroupDisplayed) {
    throw new Error(logError(ELEMENT_NOT_VISIBLE + ' (first ViewGroup)'));
  }
  // Find the TextView with the header text inside the ViewGroup
  const header = await viewGroup.$(TOPICS_SELECTORS.headerInViewGroup(escapeForRegex(headerText)));
  const isHeaderDisplayed = await header.waitForDisplayed({ timeout: ELEMENT_TIMEOUTS.QUICK_CHECK }).catch(() => false);
  if (!isHeaderDisplayed) {
    throw new Error(textNotFound(headerText));
  }
  console.log(`✅ Header '${headerText}' is present in the first ViewGroup!`);
  return header;
}

/**
 * Finds an element with the given content-desc if present on the page.
 * @param client WebdriverIO browser instance
 * @param contentDesc The content-desc to look for
 * @returns Promise<ChainablePromiseElement> the element if found
 */
export async function findElementByContentDesc(client: Browser, contentDesc: string): Promise<ChainablePromiseElement> {
  const selector = TEXT_SELECTORS.byDescription(escapeForRegex(contentDesc));
  const element = await client.$(selector);
  const isDisplayed = await element.waitForDisplayed({ timeout: ELEMENT_TIMEOUTS.STANDARD }).catch(() => false);
  if (isDisplayed) {
    // Get the whole content-desc for logging
    const desc = await element.getAttribute('content-desc');
    console.log(`✅ Element with content-desc '${desc}' is present on the page!`);
    return element;
  } else {
    throw new Error(textNotFound(contentDesc));
  }
}

/**
 * Clicks an element by its content-desc and logs its content-desc.
 * @param client WebdriverIO browser instance
 * @param contentDesc The content-desc of the element to click
 * @param elementName The name to use in logs and errors
 */
export async function clickElementByContentDesc(client: Browser, contentDesc: string, elementName: string): Promise<void> {
    const selector = `//android.view.ViewGroup[@content-desc="${contentDesc}"]`;
    const elem = await client.$(selector);
    const isDisplayed = await elem.waitForDisplayed({ timeout: ELEMENT_TIMEOUTS.STANDARD }).catch(() => false);
    if (isDisplayed) {
        await elem.click();
        console.log(`✅ Clicked element with content-desc: '${contentDesc}'`);
    } else {
        throw new Error(elementNameNotFound(elementName));
    }
}
