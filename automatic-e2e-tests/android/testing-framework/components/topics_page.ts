/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Topics Page Component Helpers for Testing Framework
 * 
 * DESCRIPTION:
 *  - Provides functions to interact with and validate the Topics page.
 *  - Includes helpers for clicking tabs, verifying titles, categories, blurbs, and menu actions.
 *  - Uses centralized constants and selectors for consistency and maintainability.
 * USAGE:
 *  - Import and use in tests that navigate or validate the Topics section.
 * ──────────────────────────────────────────────────────────────
 */ 


import type { Browser, ChainablePromiseElement } from 'webdriverio';
import { logError, THREE_DOTS_NOT_FOUND, BACK_BUTTON_NOT_FOUND } from '../constants/error_constants';
import { assertMatch } from '../utils/helper_functions';
import { clickElementByContentDesc } from '../utils/text_finder';
import { ELEMENT_TIMEOUTS } from '../constants/timeouts';
import { TOPICS_SELECTORS } from '../constants/selectors';

// || Helper Functions for topics_page ||

/**
 * Gets a TextView element from the Topics page by index.
 * Uses centralized selectors for consistent element identification.
 * @param client WebdriverIO browser instance
 * @param index The index of the TextView to get (1-based)
 * @returns ChainablePromiseElement The TextView element at the specified index
 */
function getTextView(client: Browser, index: number): ChainablePromiseElement {
    return client.$(TOPICS_SELECTORS.textView(index));
}


// || Topics Page Functions ||


/**
 * Clicks the back button on the Topics page.
 * Uses centralized selector for the back button element.
 * @param client WebdriverIO browser instance
 */
export async function navigateBackFromTopic(client: Browser): Promise<void> {
  const backButton = await client.$(TOPICS_SELECTORS.backButton);
  const isDisplayed = await backButton.waitForDisplayed({ timeout: ELEMENT_TIMEOUTS.STANDARD }).catch(() => false);
  if (isDisplayed) {
    await backButton.click();
    console.log("✅ Back button clicked on Topics page.");
  } else {
    throw new Error(logError(BACK_BUTTON_NOT_FOUND));
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
    assertMatch('Topic title', topicText, expectedTitle);
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
    assertMatch('Category', categoryText, expectedCategory);
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
    assertMatch('Blurb', blurbText, expectedBlurb);
}



/**
 * Clicks the "Sources" element on the Topics page using centralized content-desc.
 * @param client WebdriverIO browser instance
 */
export async function clickSources(client: Browser): Promise<void> {
    await clickElementByContentDesc(client, TOPICS_SELECTORS.contentDesc.sources, "Sources");
}

/**
 * Clicks the "Sheets" element on the Topics page using centralized content-desc.
 * @param client WebdriverIO browser instance
 */
export async function clickSheets(client: Browser): Promise<void> {
    await clickElementByContentDesc(client, TOPICS_SELECTORS.contentDesc.sheets, "Sheets");
}


/**
 * Clicks the three dots menu that appears next to each source under the sources section.
 * Uses centralized selector for the source menu element.
 * @param client WebdriverIO browser instance
 */
export async function openSourceMenu(client: Browser): Promise<void> {
    const threeDotsElem = await client.$(TOPICS_SELECTORS.sourceMenu);
    const isDisplayed = await threeDotsElem.waitForDisplayed({ timeout: ELEMENT_TIMEOUTS.STANDARD }).catch(() => false);
    if (isDisplayed) {
        await threeDotsElem.click();
        console.log("✅ Three dots menu clicked on Topics page.");
    } else {
        throw new Error(logError(THREE_DOTS_NOT_FOUND));
    }
}
