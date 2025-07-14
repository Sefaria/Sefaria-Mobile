/**
 * Centralized error message constants and templates for Sefaria App Tests.
 * Use these for all error and assertion messages to ensure consistency and easy updates.
 */

// Static error messages
export const NAV_BAR_NOT_DISPLAYED = '❌ Navigation bar is not displayed!';
export const SCROLLVIEW_NOT_VISIBLE = '❌ ScrollView is not visible.';
export const ELEMENT_NOT_VISIBLE = '❌ Element is not visible.';
export const SCROLLVIEW_NOT_AVAILABLE = '❌ ScrollView is not available or visible.';
export const CLOSE_POPUP_SUCCESS = '✅ Closed pop-up';
export const CLOSE_POPUP_NOT_VISIBLE = '⚠️ Close button not visible';


/**
 * Logs the error message and returns it.
 * Use this in error message functions to ensure all errors are logged and returned.
 * USe it inside a throw new Error(logError()) when not using dynamic error messages (e.g textNotFound(text), ..)
 * @param message - The error message to log and return.
 * @returns The same error message string.
 */
export function logError(message: string): string {
  console.error(message);
  return message;
}

// Dynamic error messages as functions
/**
 * Error message for when a specific text is not found on the page.
 * @param text - The text that was not found.
 */
export const textNotFound = (text: string) =>
  logError(`❌ Text '${text}' not found on the page!`);

/**
 * Error message for when the actual text does not match the expected text.
 * @param expected - The expected text.
 * @param found - The actual text found.
 */
export const titleMismatch = (expected: string, found: string) =>
  logError(`❌ Text does not match. Expected: "${expected}", Found: "${found}"`);

/**
 * Error message for when the center pixel color does not match the expected color.
 * @param actual - The actual color value (e.g., 'rgb(255,0,0)').
 * @param expected - The expected color value (e.g., 'rgb(255,0,0)').
 */
export const colorMismatch = (actual: string, expected: string) =>
  logError(`❌ Center pixel color is ${actual}, expected ${expected}`);

/**
 * Error message for when a ViewGroup with a specific accessibility id is not found.
 * @param id - The accessibility id.
 */
export const accessibilityIdNotFound = (id: string) =>
  logError(`❌ ViewGroup with accessibility id "${id}" not found.`);

/**
 * Error message for when there is an error checking for a title.
 * @param title - The title being checked.
 * @param error - The error thrown.
 */
export const errorCheckingTitle = (title: string, error: unknown) =>
  logError(`❌ Error checking for title "${title}": ${error}`);

/**
 * Error message for when there is an error checking for an accessibility id.
 * @param id - The accessibility id being checked.
 * @param error - The error thrown.
 */
export const errorCheckingAccessibilityId = (id: string, error: unknown) =>
  logError(`❌ Error checking for accessibility id "${id}": ${error}`);

/**
 * Error message for when a swipe in a given direction fails.
 * @param direction - The direction of the swipe ('up' or 'down').
 * @param error - The error thrown.
 */
export const swipeDirectionFailed = (direction: string, error: unknown) =>
  logError(`❌ Swipe ${direction} failed: ${error}`);

/**
 * Error message for when an API call result does not match the result on the page.
 * @param label - The label for the API call (e.g., "Parashat Hashavua", "Haftarah").
 * @param actual - The actual result found on the page.
 */
export const apiResultMismatch = (label: string, actual: string) =>
  logError(`❌ API call for ${label} does not match result on page: "${actual}"`);


// ||Stored Values||


// Allows a threshold for matching colors (r,g,b), as different screens have slightly different color output
export const THRESHOLD_RGB = { r: 32, g: 5, b: 10 }; 

// Months storage for Sefaria and getting current Jewish Date
export const HEBREW_MONTHS = [
    "Tishri", "Heshvan", "Kislev", "Tevet",
    "Shevat", "Adar", "Adar II", "Nisan",
    "Iyar", "Sivan", "Tammuz", "Av", "Elul"
  ];
