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

import { logError, HEBREW_MONTHS, COLOR_THRESHOLDS } from '../constants';


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

  const month = HEBREW_MONTHS[monthNum] || "";
  const day = now.toLocaleString('en-u-ca-hebrew', { day: 'numeric' });
  const year = now.toLocaleString('en-u-ca-hebrew', { year: 'numeric' });
  return `${month} ${day}, ${year}`;
}


/**
 * Checks if actual text matches expected text, logs result, and throws error if not matching.
 * @param label Label for the value being checked (e.g., 'Category', 'Topic title')
 * @param actual The actual text found
 * @param expected The expected text to compare
 */
export function assertMatch(label: string, actual: string, expected: string): void {
  const isMatch = actual === expected;
  if (!isMatch) {
    throw new Error(logError(`❌ ${label} does not match. Found: '${actual}', Expected: '${expected}'`));
  }
  console.debug(`${label} matches: '${actual}'`);
}

/**
 * Extracts and cleans the test title from Mocha's test context.
 * @param testContext Mocha test context (this)
 * @returns Cleaned test title string
 */
export function getCleanTestTitle(testContext: Mocha.Context): string {
  // Fetch the current test title for logging (defaults to 'Test' to ensure testTitle is always defined)
  let testTitle = testContext.test?.title || 'Test';
  // .test.title automatically adds "before each", so we remove it for cleaner test names
  if (testTitle.includes('before each')) {
    testTitle = testTitle.replace(/.*before each.*hook for /, '');
  }
  // Remove all double quotes and backslashes
  testTitle = testTitle.replace(/["\\]/g, '');
  return testTitle;
}