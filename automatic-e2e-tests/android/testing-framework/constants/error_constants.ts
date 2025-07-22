/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Centralized Error Message Constants & Templates for Testing Framework
 * 
 * DESCRIPTION:
 *  - Provides static and dynamic error messages for Sefaria App automated tests.
 *  - Ensures consistency and maintainability of error and assertion messages.
 * USAGE:
 *  - Import and use these constants/functions for all error handling and assertions.
 * ──────────────────────────────────────────────────────────────
 */



// Static error messages
export const NAV_BAR_NOT_DISPLAYED = '❌ Navigation bar is not displayed!';
export const SCROLLVIEW_NOT_VISIBLE = '❌ ScrollView is not visible.';
export const ELEMENT_NOT_VISIBLE = '❌ Element is not visible.';
export const SCROLLVIEW_NOT_AVAILABLE = '❌ ScrollView is not available or visible.';
export const CLOSE_POPUP_SUCCESS = '✅ Closed pop-up';
export const CLOSE_POPUP_NOT_VISIBLE = '⚠️ Close button not visible';
export const THREE_DOTS_NOT_FOUND = '❌ Three dots menu not found or not visible';
export const BACK_BUTTON_NOT_FOUND = '❌ Back button not found or not visible';


/**
 * Logs the error message and returns it.
 * Use this in error message functions to ensure all errors are logged and returned.
 * Use it inside a throw new Error(logError()) when not using dynamic error messages (e.g textNotFound(text), ..)
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


/**
 * Error message for when an element is not found after maximum swipe attempts.
 * @param text - The text of the element that was not found.
 * @param maxAttempts - The maximum number of swipe attempts.
*/
export const elementNotFoundAfterSwipes = (text: string, maxAttempts: number) =>
  logError(`❌ Element with text "${text}" not found after ${maxAttempts} swipes.`);

/**
 * Error message for when there is an error selecting an item by its text.
 * @param text - The text of the item being selected.
 * @param error - The error thrown.
 */
export const errorSelectingItemByText = (text: string, error: unknown) =>
  logError(`❌ Error selecting item with text "${text}": ${error}`);

/**
 * Error message for when a specific element by name is not found on the page.
 * @param elementName - The name of the element that was not found.
 */
export const elementNameNotFound = (elementName: string) =>
  logError(`❌ Element "${elementName}" not found on the page!`);


// || Success messages that require parameters ||

/**
 * Success message for when an element is found and visible after swiping.
 * @param text - The text of the element that was found.
 * @param attempts - The number of swipe attempts it took to find the element.
 */
export const elementFoundAfterSwipes = (text: string, attempts: number) =>
  `✅ Element with text "${text}" is now visible after ${attempts} swipe(s).`;




