/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Topics Page Component Helpers for Testing Framework
 * 
 * DESCRIPTION:
 *  - Provides functions to interact with and validate the Topics page.
 *  - Includes helpers for clicking tabs, verifying titles, categories, blurbs, and menu actions.
 * USAGE:
 *  - Import and use in tests that navigate or validate the Topics section.
 * ──────────────────────────────────────────────────────────────
 */ 


import type { Browser, ChainablePromiseElement } from 'webdriverio';
import { HELPER_FUNCTIONS } from '../utils';
import { logError, STATIC_ERRORS, SELECTORS, DYNAMIC_ERRORS } from '../constants';


// || Helper Functions for topics_page ||

/**
 * Gets a TextView element from the Topics page by index.
 * @param client WebdriverIO browser instance
 * @param index The index of the TextView to get (1-based)
 * @returns ChainablePromiseElement The TextView element at the specified index
 */
function getTextView(client: Browser, index: number): ChainablePromiseElement {
    return client.$(SELECTORS.TOPICS_SELECTORS.textView(index));
}


// || Topics Page Functions ||


/**
 * Clicks the back button on the Topics page.
 * Uses centralized selector for the back button element.
 * @param client WebdriverIO browser instance
 */
export async function navigateBackFromTopic(client: Browser): Promise<void> {
  const backButton = await client.$(SELECTORS.TOPICS_SELECTORS.backButton);
  const isDisplayed = await backButton.waitForDisplayed().catch(() => false);
  if (isDisplayed) {
    await backButton.click();
    console.debug("Back button clicked on Topics page.");
  } else {
    throw new Error(logError(STATIC_ERRORS.BACK_BUTTON_NOT_FOUND));
  }
}

/**
 * Verifies the topic title from the Topics page matches the expected string.
 * @param client WebdriverIO browser instance
 * @param expectedTitle The string to compare the topic title to
 */
export async function verifyTopicTitle(client: Browser, expectedTitle: string): Promise<void> {
    const textView = await getTextView(client, 1);
    const topicText = await textView.getText();
    HELPER_FUNCTIONS.assertMatch('Topic title', topicText, expectedTitle);
}

/**
 * Verifies the category from the Topics page matches the expected string.
 * Finds the second TextView inside the second ViewGroup within the ScrollView.
 * @param client WebdriverIO browser instance
 * @param expectedCategory The string to compare the category text to
 */
export async function verifyTopicCategory(client: Browser, expectedCategory: string): Promise<void> {
    const textView = await getTextView(client, 2);
    const categoryText = await textView.getText();
    HELPER_FUNCTIONS.assertMatch('Category', categoryText, expectedCategory);
}

/**
 * Verifies the blurb text from the Topics page matches the expected string.
 * Finds the third TextView inside the second ViewGroup within the ScrollView.
 * @param client WebdriverIO browser instance
 * @param expectedBlurb The string to compare the blurb text to
 */
export async function verifyTopicBlurb(client: Browser, expectedBlurb: string): Promise<void> {
    const textView = await getTextView(client, 3);
    const blurbText = await textView.getText();
    HELPER_FUNCTIONS.assertMatch('Blurb', blurbText, expectedBlurb);
}



/**
 * Clicks the "Sources" element on the Topics page.
 * @param client WebdriverIO browser instance
 */
export async function clickSources(client: Browser): Promise<void> {
    const sourcesSelector = await client.$(SELECTORS.TOPICS_SELECTORS.sources);
    const isDisplayed = await sourcesSelector.waitForDisplayed().catch(() => false);
    if (isDisplayed) {
        await sourcesSelector.click();
        console.debug("Sources clicked on Topics page.");
    }
    else {
        throw new Error(logError(DYNAMIC_ERRORS.elementNameNotFound("Sources")));
    }
}

/**
 * Clicks the "Sheets" element on the Topics page.
 * @param client WebdriverIO browser instance
 */
export async function clickSheets(client: Browser): Promise<void> {
    const sheetsSelector = await client.$(SELECTORS.TOPICS_SELECTORS.sheets);
    const isDisplayed = await sheetsSelector.waitForDisplayed().catch(() => false);
    if (isDisplayed) {
        await sheetsSelector.click();
        console.debug("Sheets clicked on Topics page.");
    }
    else {
        throw new Error(logError(DYNAMIC_ERRORS.elementNameNotFound("Sheets")));
    }   
}


/**
 * Clicks the three dots menu that appears next to each source under the sources section.
 * @param client WebdriverIO browser instance
 */
export async function clickThreeDotsMenu(client: Browser): Promise<void> {
    const threeDotsElem = await client.$(SELECTORS.TOPICS_SELECTORS.threeDotsMenu);
    const isDisplayed = await threeDotsElem.waitForDisplayed().catch(() => false);
    if (isDisplayed) {
        await threeDotsElem.click();
        console.debug("Three dots menu clicked on Topics page.");
    } else {
        throw new Error(logError(STATIC_ERRORS.THREE_DOTS_NOT_FOUND));
    }
}

/**
 * Verifies that the three dots menu does not appear on the page.
 * This should not be present on the sheets page.
 * @param client WebdriverIO browser instance
 */
export async function verifyThreeDotsNotAppeared(client: Browser): Promise<void> {
    const threeDotsElem = await client.$(SELECTORS.TOPICS_SELECTORS.threeDotsMenu);
    const isDisplayed = await threeDotsElem.isDisplayed().catch(() => false);
    if (isDisplayed) {
        throw new Error(logError("Three dots menu should not be displayed on this page."));
    } else {
        console.debug("Three dots menu correctly not displayed on page.");
    }
}