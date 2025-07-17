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
import { logError,THREE_DOTS_NOT_FOUND, BACK_BUTTON_NOT_FOUND } from '../constants/error_constants';
import { assertMatch } from '../utils/helper_functions';
import { clickElementByContentDesc } from '../utils/text_finder';

// || Helper Functions for topics_page ||

/**
 * 
 * @param client WebdriverIO browser instance
 * @param index The index of the TextView to get (1-based)
 * @returns ChainablePromiseElement The TextView element at the specified index
 */
function getTextView(client: Browser, index: number): ChainablePromiseElement {
    return client.$(`//android.widget.ScrollView/android.view.ViewGroup/android.view.ViewGroup[1]/android.widget.TextView[${index}]`);
}


// || Topics Page Functions ||


/**
 * Clicks the back button on the Topics page.
 * The back button is located using a specific XPath selector.
 * @param client WebdriverIO browser instance
 */
export async function clickBackButton(client: Browser): Promise<void> {
  const backButtonXPath = "//android.widget.ScrollView/android.view.ViewGroup/android.view.ViewGroup[1]/android.view.ViewGroup[1]/android.widget.ImageView";
  const backButton = await client.$(backButtonXPath);
  const isDisplayed = await backButton.waitForDisplayed({ timeout: 4000 }).catch(() => false);
  if (isDisplayed) {
    await backButton.click();
    console.log("✅ Back button clicked on Topics page.");
  } else {
    throw new Error(logError(BACK_BUTTON_NOT_FOUND));
  }
}

/**
 * Gets the topic title from the Topics page and compares it to the expected string.
 * @param client WebdriverIO browser instance
 * @param expectedTitle The string to compare the topic title to
 */
export async function getTopicTitle(client: Browser, expectedTitle: string): Promise<void> {
    const textView = await getTextView(client, 1);
    const topicText = await textView.getText();
    assertMatch('Topic title', topicText, expectedTitle);
}

/**
 * Gets the category from the Topics page and compares it to the expected string.
 * Finds the second TextView inside the second ViewGroup within the ScrollView.
 * @param client WebdriverIO browser instance
 * @param expectedCategory The string to compare the category text to
 */
export async function getCategory(client: Browser, expectedCategory: string): Promise<void> {
    const textView = await getTextView(client, 2);
    const categoryText = await textView.getText();
    assertMatch('Category', categoryText, expectedCategory);
}

/**
 * Gets the blurb text from the Topics page and compares it to the expected string.
 * Finds the third TextView inside the second ViewGroup within the ScrollView.
 * @param client WebdriverIO browser instance
 * @param expectedBlurb The string to compare the blurb text to
 */
export async function getBlurb(client: Browser, expectedBlurb: string): Promise<void> {
    const textView = await getTextView(client, 3);
    const blurbText = await textView.getText();
    assertMatch('Blurb', blurbText, expectedBlurb);
}



/**
 * Clicks the "Sources" element on the Topics page and logs its content-desc.
 * @param client WebdriverIO browser instance
 */
export async function clickSources(client: Browser): Promise<void> {
    await clickElementByContentDesc(client, "Sources", "Sources");
}

/**
 * Clicks the "Sheets" element on the Topics page and logs its content-desc.
 * @param client WebdriverIO browser instance
 */
export async function clickSheets(client: Browser): Promise<void> {
    await clickElementByContentDesc(client, "Sheets", "Sheets");
}


/**
 * Clicks the three dots menu that appears next to each source under the sources section.
 * @param client WebdriverIO browser instance
 */
export async function clickThreeDots(client: Browser): Promise<void> {
    const threeDotsSelector = "//android.widget.ScrollView/android.view.ViewGroup/android.view.ViewGroup[4]";
    const threeDotsElem = await client.$(threeDotsSelector);
    const isDisplayed = await threeDotsElem.waitForDisplayed({ timeout: 4000 }).catch(() => false);
    if (isDisplayed) {
        await threeDotsElem.click();
        console.log("✅ Three dots menu clicked on Topics page.");
    } else {
        throw new Error(logError(THREE_DOTS_NOT_FOUND));
    }
}