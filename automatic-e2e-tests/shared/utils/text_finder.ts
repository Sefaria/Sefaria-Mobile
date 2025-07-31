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
import { escapeForRegex } from './helper_functions';
import { DYNAMIC_ERRORS, STATIC_ERRORS, logError, SELECTORS, ELEMENT_TIMEOUTS } from '../constants';



// Functions to help locate Text on Page

/**
 * Finds and returns a TextView element with the exact given text if present on the page.
 * Used for quick verification of UI state.
 * @param client WebdriverIO browser instance
 * @param text The exact text to look for
 * @returns `Promise<ChainablePromiseElement>` the text element if found
 */
export async function findTextElement(client: Browser, text: string): Promise<ChainablePromiseElement> {
  const selector = SELECTORS.TEXT_SELECTORS.exactText(escapeForRegex(text));
  const element = await client.$(selector);
  const isDisplayed = await element.waitForDisplayed().catch(() => false);
  if (isDisplayed) {
    console.debug(`Text '${text}' is present on the page!`);
    return element;
  } else {
    throw new Error(DYNAMIC_ERRORS.textNotFound(text));
  }
}

/**
 * Finds and returns a TextView element containing the given text if present on the page.
 * Used for less strict verification (substring match).
 * @param client WebdriverIO browser instance
 * @param text The text to look for (substring match)
 * @returns `Promise<ChainablePromiseElement>` the text element if found
 */
export async function findTextContaining(client: Browser, text: string): Promise<ChainablePromiseElement> {
  const selector = SELECTORS.TEXT_SELECTORS.containsText(escapeForRegex(text));
  const element = await client.$(selector);
  const isDisplayed = await element.waitForDisplayed().catch(() => false);
  if (isDisplayed) {
    console.debug(`Text containing '${text}' is present on the page! Found text: '${await element.getText()}'`);
    return element;
  } else {
    throw new Error(DYNAMIC_ERRORS.textNotFound(text));
  }
}

/**
 * Finds and verifies the header on top of the page with the given text * @param client WebdriverIO browser instance
 * @param headerText The header text to check for (e.g., "Explore by Topic", "Mishnah")
 * @returns `Promise<ChainablePromiseElement>` The header element if found
 */
export async function verifyHeaderOnPage(client: Browser, headerText: string): Promise<ChainablePromiseElement> {
  const header = await client.$(SELECTORS.TEXT_SELECTORS.headerInViewGroup(escapeForRegex(headerText)));
  const isHeaderDisplayed = await header.waitForDisplayed().catch(() => false);
  if (!isHeaderDisplayed) {
    throw new Error(DYNAMIC_ERRORS.textNotFound(escapeForRegex(headerText)));
  }
  console.debug(`Header '${headerText}' is present!`);
  return header;
}

/**
 * Finds an element with the given content-desc if present on the page.
 * @param client WebdriverIO browser instance
 * @param contentDesc The content-desc to look for
 * @returns `Promise<ChainablePromiseElement>` the element if found
 */
export async function findElementByContentDesc(client: Browser, contentDesc: string): Promise<ChainablePromiseElement> {
  const selector = SELECTORS.TEXT_SELECTORS.byDescription(escapeForRegex(contentDesc));
  const element = await client.$(selector);
  const isDisplayed = await element.waitForDisplayed().catch(() => false);
  if (isDisplayed) {
    // Get the whole content-desc for logging
    const desc = await element.getAttribute('content-desc');
    console.debug(`Element with content-desc '${desc}' is present on the page!`);
    return element;
  } else {
    throw new Error(DYNAMIC_ERRORS.textNotFound(contentDesc));
  }
}

/**
 * Clicks an element by its content-desc and logs its content-desc.
 * @param client WebdriverIO browser instance
 * @param contentDesc The content-desc of the element to click
 * @param elementName The name to use in logs and errors
 */
export async function clickElementByContentDesc(client: Browser, contentDesc: string, elementName: string): Promise<void> {
  const selector = SELECTORS.TEXT_SELECTORS.byContentDesc(contentDesc);
  const elem = await client.$(selector);
  const isDisplayed = await elem.waitForDisplayed().catch(() => false);
  if (isDisplayed) {
    await elem.click();
    console.debug(`Clicked element with content-desc: '${contentDesc}'`);
  } else {
    throw new Error(DYNAMIC_ERRORS.elementNameNotFound(elementName));
  }
}
