/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Helper Functions for  Testing Framework
 * 
 * DESCRIPTION:
 *  - Helper functions for various utilities in the Sefaria testing framework
 *  - Includes text escaping, color conversion, date formatting, and more.
 * USAGE:
 *  - These functions are used across different components and tests.
 * ──────────────────────────────────────────────────────────────
 */

import { logError, Texts, COLOR_THRESHOLDS, Selectors} from '../constants';
import { Navbar } from '../components';
import { PopUps, BrowserstackReport } from '.';
import * as fs from 'fs';

/**
 * Allows double qoutes (and other potentially breaking characters) to be inside .text()
 * @param text - The text to escape
 * @return - The escaped text
 */
export function escapeForRegex(text: string): string {
  // if (process.env.PLATFORM === 'ios') {
  //   return text;
  // }
  return text.replace(/[*+?^${}|[\]\\]/g, '\\$&').replace(/"/g, '\\"');
}


/**
 * Converts a hex color string (e.g., "#ff00ff" or "#f0f") to an {r, g, b} object.
 * Supports 3, 4, 6, or 8 digit hex codes.
 * @param hex - The hex color string
 * @return - An object with r, g, b properties, each in the range 0-255
 * @throws - If the hex string is invalid
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let c = hex.replace(/^#/, '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  } else if (c.length === 4) {
    c = c.split('').map(x => x + x).join('');
    // Ignore alpha
    c = c.slice(0, 6);
  } else if (c.length === 8) {
    // Ignore alpha
    c = c.slice(0, 6);
  }
  if (c.length !== 6) throw new Error(logError(`Invalid hex color: ${hex}`));
  return {
    r: parseInt(c.slice(0, 2), 16),
    g: parseInt(c.slice(2, 4), 16),
    b: parseInt(c.slice(4, 6), 16),
  };
}

/**
 * Helper function to compare colors with a specific tolerance for each channel
 * @param a - First color object with r, g, b properties
 * @param b - Second color object with r, g, b properties
 * @param tolerance - The maximum allowed difference for each color channel (can be a number or { r, g, b })
 * @returns true if the colors are close enough, otherwise false
 */
export function colorsAreClose(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  tolerance: number | { r: number; g: number; b: number } = COLOR_THRESHOLDS.STANDARD_NUMERIC
): boolean {
  const t = typeof tolerance === 'number'
    ? { r: tolerance, g: tolerance, b: tolerance }
    : tolerance;
  return (
    Math.abs(a.r - b.r) <= t.r &&
    Math.abs(a.g - b.g) <= t.g &&
    Math.abs(a.b - b.b) <= t.b
  );
}


/**
 * Returns the current Hebrew date as a formatted string (e.g., "Nisan 15, 5784")
 * Uses a fixed month name array for custom spelling.
 * @returns The formatted Hebrew date string
 */
export function getHebrewDate(): string {
  const now = new Date();
  // Get the Hebrew month number (1-based)
  const monthNum = Number(now.toLocaleString('en-u-ca-hebrew', { month: 'numeric' }));

  const month = Texts.HEBREW_MONTHS[monthNum] || "";
  const day = now.toLocaleString('en-u-ca-hebrew', { day: 'numeric' });
  const year = now.toLocaleString('en-u-ca-hebrew', { year: 'numeric' });
  return `${month} ${day}, ${year}`;
}


/**
 * Checks if actual text matches expected text, logs result, and throws error if not matching.
 * @param label Label for the value being checked (e.g., 'Category', 'Topic title')
 * @param actual The actual text found
 * @param expected The expected text to compare
 * @returns true if the texts match, otherwise throws an error
 * @throws Error if the texts do not match
 */
export function assertMatch(label: string, actual: string, expected: string): boolean {
  const isMatch = actual === expected;
  if (!isMatch) {
    throw new Error(logError(`❌ ${label} does not match. Found: '${actual}', Expected: '${expected}'`));
  }
  console.debug(`${label} matches: '${actual}'`);
  return isMatch;
}

/**
 * Waits for and validates that an element is displayed. Used for allowing a longer check for elements that may take time to appear.
 * Used to not repeat the same code in multiple places.
 * @param element - WebdriverIO element
 * @param elementName - Name for error messages
 * @throws Will throw an error if the element is not displayed
 */
export async function ensureElementDisplayed(element: any, elementName: string): Promise<void> {
  try {
    await element.waitForDisplayed();
    const isDisplayed = await element.isDisplayed();
    if (!isDisplayed) {
      throw new Error(logError(`${elementName} is not displayed`));
    }
  } catch (error) {
    throw new Error(logError(`Failed to find ${elementName}: ${error}`));
  }
}

/**
 * Extracts and cleans the test title from Mocha's test context.
 * @param testContext Mocha test context (this)
 * @returns Cleaned test title string
 */
export function getTestTitle(testContext: Mocha.Context): string {
  if (!testContext.test) {
    throw new Error(logError('Test context does not contain a test object.'));
  }
  let testTitle = testContext.test.title;
  if (testTitle.includes('before each')) {
    testTitle = testTitle.replace(/.*before each.*hook for /, '');
  }
  if (testTitle.includes('after each')) {
    testTitle = testTitle.replace(/.*after each.*hook for /, '');
  }
  if (testTitle.includes('before all')) {
    testTitle = testTitle.replace(/.*before all.*hook for /, '');
  }
  if (testTitle.includes('after all')) {
    testTitle = testTitle.replace(/.*after all.*hook for /, '');
  }
  testTitle = testTitle.replace(/["\\]/g, '');
  return testTitle;
}

/**
 * Generates the build name seen on browserstack.
 * This is used to identify the test run in reports.
 * @param type - Type of build (e.g., "Regression", "Sanity")
 * @returns A cleaned version of the test title, suitable for use in logs or reports.
 */
export function getBuildName(type: String): string {
  const platform = process.env.PLATFORM?.toUpperCase() || 'UNKNOWN';
  const date = new Date().toISOString().slice(0, 10);
  return `Sefaria ${type} ${platform}: ${date}`;
}


/**
 * Takes a screenshot and saves it to the screenshots directory
 * @param client WebdriverIO browser instance
 * @param testTitle Test title for filename
 * @param errorType Optional error type to include in filename (default: 'FAIL')
 * @returns Promise<string> The path where the screenshot was saved
 */
export async function takeScreenshot(
  client: WebdriverIO.Browser, 
  testTitle: string, 
  errorType: string = 'FAIL'
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // Clean the test title more thoroughly for Windows file naming
  const cleanTestTitle = testTitle
    .replace(/[<>:"/\\|?*]/g, '_')  // Remove Windows invalid filename characters
    .replace(/\s+/g, '_')           // Replace spaces with underscores
    .replace(/_+/g, '_')            // Replace multiple underscores with single
    .replace(/^_|_$/g, '');         // Remove leading/trailing underscores
  
  const filename = `${errorType}_${cleanTestTitle}_${timestamp}.png`;
  const platform = process.env.PLATFORM || 'unknown';
  const screenshotPath = `./screenshots/${platform}/${filename}`;
  
  try {
    const path = require('path');
    const fs = require('fs');
    
    // Resolve the full path and ensure directory exists
    const fullPath = path.resolve(screenshotPath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Take screenshot
    const screenshotBase64 = await client.takeScreenshot();
    const screenshotBuffer = Buffer.from(screenshotBase64, 'base64');
    
    // Write file with full path
    fs.writeFileSync(fullPath, screenshotBuffer);
    console.log(`[SCREENSHOT SAVED] ${screenshotPath}`);
    return screenshotPath;
  } catch (err) {
    console.error('❌ Failed to save screenshot:', err);
    console.error('❌ Attempted path:', screenshotPath);
    throw err;
  }
}

/**
 * Performs initial setup steps for the test client:
 * - Handles offline popup
 * - Waits for navbar
 * - Navigates to Texts tab
 */
export async function handleSetup(client: WebdriverIO.Browser) {
  await PopUps.handleOfflinePopUp(client);
  await Navbar.waitForNavBar(client);
  await Navbar.clickNavBarItem(client, Selectors.NAVBAR_SELECTORS.navItems.texts);
}

/**
 * Handles teardown after each test:
 * - Reports status to BrowserStack
 * - Logs result
 * - Deletes client session if deleteSession is true (default)
 */
export async function handleTeardown(client: WebdriverIO.Browser, testContext: Mocha.Context, testTitle: string, deleteSession: boolean=true) {
  
  
  if (client) {
    if (process.env.RUN_ENV == 'browserstack') {
      await BrowserstackReport.reportToBrowserstack(client, testContext);
    }
    if (testContext.currentTest?.state === 'passed') {
      console.log(`✅ (PASSED); Finished test: ${testTitle}\n`);
    } else {
      await takeScreenshot(client, testTitle, 'FAIL');
      console.log(`❌ (FAILED); Finished test: ${testTitle}\n`);
    }
    if (deleteSession) {
      await client.deleteSession();
    }
  }
  else {
    console.warn('No client session to delete.');
  }
}