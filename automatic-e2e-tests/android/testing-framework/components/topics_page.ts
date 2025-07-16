import type { Browser, ChainablePromiseElement } from 'webdriverio';
import { logError } from '../utils/constants';

// || Helper Functions for topics_page (probably could move to helper functions||

/**
 * Checks if actual text matches expected text, logs result, and throws error if not matching.
 * @param label Label for the value being checked (e.g., 'Category', 'Topic title')
 * @param actual The actual text found
 * @param expected The expected text to compare
 */
function assertMatch(label: string, actual: string, expected: string): void {
    const isMatch = actual === expected;
    if (!isMatch) {
        throw new Error(logError(`❌ ${label} does not match. Found: '${actual}', Expected: '${expected}'`));
    }
    console.log(`✅ ${label} matches: '${actual}'`);
}


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
    throw new Error("❌ Back button not found or not visible on Topics page.");
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
    const sourcesSelector = '//android.view.ViewGroup[@content-desc="Sources"]';
    const sourcesElem = await client.$(sourcesSelector);
    const isDisplayed = await sourcesElem.waitForDisplayed({ timeout: 4000 }).catch(() => false);
    if (isDisplayed) {
        const contentDesc = await sourcesElem.getAttribute('content-desc');
        await sourcesElem.click();
        console.log(`✅ Clicked element with content-desc: '${contentDesc}'`);
    } else {
        throw new Error(logError('❌ "Sources" element not found or not visible on Topics page.'));
    }
}

/**
 * Clicks the "Sheets" element on the Topics page and logs its content-desc.
 * @param client WebdriverIO browser instance
 */
export async function clickSheets(client: Browser): Promise<void> {
    const sheetsSelector = '//android.view.ViewGroup[@content-desc="Sheets"]';
    const sheetsElem = await client.$(sheetsSelector);
    const isDisplayed = await sheetsElem.waitForDisplayed({ timeout: 4000 }).catch(() => false);
    if (isDisplayed) {
        const contentDesc = await sheetsElem.getAttribute('content-desc');
        await sheetsElem.click();
        console.log(`✅ Clicked element with content-desc: '${contentDesc}'`);
    } else {
        throw new Error(logError('❌ "Sheets" element not found or not visible on Topics page.'));
    }
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
        throw new Error(logError("❌ Three dots menu not found or not visible on Topics page."));
    }
}