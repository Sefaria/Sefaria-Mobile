/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Interaction and Validation for the Topics Screen and its sub screens
 * 
 * DESCRIPTION:
 *  - Provides functions to interact with and validate the Topics page.
 *  - Includes helpers for clicking tabs, verifying titles, categories, blurbs, and menu actions.
 * USAGE:
 *  - Import and use in tests that navigate or validate the Topics section.
 * ──────────────────────────────────────────────────────────────
 */ 


import type { Browser, ChainablePromiseElement } from 'webdriverio';
import { HelperFunctions } from '../utils';
import { Selectors } from '../constants';


// || Helper Functions for topics_page ||

/**
 * Gets a TextView element from the Topics page by index.
 * @param client WebdriverIO browser instance
 * @param index The index of the TextView to get (1-based)
 * @returns ChainablePromiseElement The TextView element at the specified index
 */
function getTextView(client: Browser, index: number): ChainablePromiseElement {
    return client.$(Selectors.TOPICS_SELECTORS.textView(index));
}


// || Topics Page Functions ||


/**
 * Clicks the back button on the Topics page.
 * Uses centralized selector for the back button element.
 * @param client WebdriverIO browser instance
 * @throws Will throw an error if the back button is not displayed
 * @returns boolean indicating success
 */
export async function navigateBackFromTopic(client: Browser): Promise<boolean> {
    const backButton = await client.$(Selectors.TOPICS_SELECTORS.backButton);
    await HelperFunctions.ensureElementDisplayed(backButton, 'Back Button');
    await backButton.click();
    console.debug("Back button clicked on Topics page.");
    return true;
}

/**
 * Verifies the topic title from the Topics page matches the expected string.
 * @param client WebdriverIO browser instance
 * @param expectedTitle The string to compare the topic title to
 * @returns boolean indicating success
 */
export async function verifyTopicTitle(client: Browser, expectedTitle: string): Promise<boolean> {
    const textView = await getTextView(client, 1);
    const topicText = await textView.getText();
    return HelperFunctions.assertMatch('Topic title', topicText, expectedTitle);
}

/**
 * Verifies the category from the Topics page matches the expected string.
 * Finds the second TextView inside the second ViewGroup within the ScrollView.
 * @param client WebdriverIO browser instance
 * @param expectedCategory The string to compare the category text to
 * @return boolean indicating success
 */
export async function verifyTopicCategory(client: Browser, expectedCategory: string): Promise<boolean> {
    const textView = await getTextView(client, 2);
    const categoryText = await textView.getText();
    return HelperFunctions.assertMatch('Category', categoryText, expectedCategory);
}

/**
 * Verifies the blurb text from the Topics page matches the expected string.
 * Finds the third TextView inside the second ViewGroup within the ScrollView.
 * @param client WebdriverIO browser instance
 * @param expectedBlurb The string to compare the blurb text to
 */
export async function verifyTopicBlurb(client: Browser, expectedBlurb: string): Promise<boolean> {
    const textView = await getTextView(client, 3);
    const blurbText = await textView.getText();
    return HelperFunctions.assertMatch('Blurb', blurbText, expectedBlurb);
}


/**
 * Clicks the "Sources" element on the Topics page.
 * @param client WebdriverIO browser instance
 * @throws Will throw an error if the Sources element is not displayed
 * @returns boolean indicating success
 */
export async function clickSources(client: Browser): Promise<boolean> {
    const sourcesSelector = await client.$(Selectors.TOPICS_SELECTORS.sources);
    await HelperFunctions.ensureElementDisplayed(sourcesSelector, 'Sources');
    await sourcesSelector.click();
    console.debug("Sources clicked on Topics page.");
    return true;
}

/**
 * Clicks the "Sheets" element on the Topics page.
 * @param client WebdriverIO browser instance
 * @throws Will throw an error if the Sheets element is not displayed
 * @return boolean indicating success
 */
export async function clickSheets(client: Browser): Promise<boolean> {
    const sheetsSelector = await client.$(Selectors.TOPICS_SELECTORS.sheets);
    await HelperFunctions.ensureElementDisplayed(sheetsSelector, 'Sheets');
    await sheetsSelector.click();
    console.debug("Sheets clicked on Topics page.");
    return true; 
}


/**
 * Clicks the three dots menu that appears next to each source under the sources section.
 * @param client WebdriverIO browser instance
 * @throws Will throw a three dots not found error if the element is not displayed
 * @return boolean indicating success
 */
export async function clickThreeDotsMenu(client: Browser): Promise<boolean> {
    const threeDotsElem = await client.$(Selectors.TOPICS_SELECTORS.threeDotsMenu);
    await HelperFunctions.ensureElementDisplayed(threeDotsElem, 'Three Dots Menu');
    await threeDotsElem.click();
    console.debug("Three dots menu clicked on Topics page.");
    return true;
}
