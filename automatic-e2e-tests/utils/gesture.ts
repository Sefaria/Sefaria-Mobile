/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Gesture and Scrolling Utilities for Testing Framework
 * 
 * DESCRIPTION:
 *  - Provides reusable helper functions for performing gestures (swipe, scroll) and
 *    scrolling-related element search in the Sefaria automated testing framework.
 *  - Includes screen dimension caching, swipe actions, and robust scrolling to elements by text.
 * USAGE:
 *  - These functions are used across different test components to simulate user interactions.
 * ──────────────────────────────────────────────────────────────
 */

import { DYNAMIC_ERRORS, SUCCESS_MESSAGES,
  SWIPE_CONFIG, GESTURE_TIMING, TOUCH_CONFIG, SWIPE_ATTEMPTS,
  SELECTORS } from '../constants';


// Cache for screen dimensions - will be set once per test session
let screenDimensions: { width: number; height: number; x: number; startY: number } | null = null;

/**
 * Gets and caches screen dimensions for the current session
 * @param client - The WebDriver client instance
 * @returns Cached screen dimensions with calculated coordinates
 */
async function getScreenDimensions(client: WebdriverIO.Browser) {
  if (!screenDimensions) {
    const { width, height } = await client.getWindowRect();
    screenDimensions = {
      width,
      height,
      x: Math.floor(width / 2),
      startY: Math.floor(height * 0.65)
    };
    console.debug(`Screen dimensions cached: ${width}x${height}`);
  }
  return screenDimensions;
}

/**
 * Checks if an element is actually visible on screen (not just in the DOM)
 * This is crucial for iOS where elements exist in DOM even when off-screen
 */
async function isElementVisibleOnScreen(
  client: WebdriverIO.Browser,
  element: ChainablePromiseElement
): Promise<boolean> {
  if (process.env.PLATFORM === 'android') {
    // Android: if element is displayed, it's visible on screen
    return await element.isDisplayed().catch(() => false);
  }
  
  // iOS: Check if element bounds are within screen viewport
  try {
    const isDisplayed = await element.isDisplayed();
    if (!isDisplayed) return false;
    
    const rectStr = await element.getAttribute('rect');
    if (!rectStr) return false;
    
    const rect = JSON.parse(rectStr);
    const { width: screenWidth, height: screenHeight } = await getScreenDimensions(client);
    
    // Element is visible if any part is within screen bounds
    const elementVisible = (
      rect.x < screenWidth &&
      rect.x + rect.width > 0 &&
      rect.y < screenHeight &&
      rect.y + rect.height > 0
    );    
    
    // console.debug(`iOS element visibility check: rect=${JSON.stringify(rect)}, screen=${screenWidth}x${screenHeight}, visible=${elementVisible}`);
    return elementVisible;
    
  } catch (error) {
    console.debug(`Error checking iOS element visibility: ${error}`);
    return false;
  }
}

/**
 * Resets the cached screen dimensions (useful when switching devices or test sessions)
 */
export function resetScreenDimensions(): void {
  screenDimensions = null;
  console.debug('Screen dimensions cache cleared');
}




/**
 * Performs a swipe gesture up or down from the bottom half middle of the screen.
 * @param client - The WebDriver client instance.
 * @param direction - 'up' to swipe up, 'down' to swipe down.
 * @param distance - The distance in pixels to swipe (default: MEDIUM_DISTANCE).
 * @param duration - The duration of the swipe in milliseconds (default: STANDARD_GESTURE).
 * @param mute - If true, suppresses console output (default: false).
 * @throws Will throw an error if the swipe fails.
 */
export async function swipeUpOrDown(
  client: WebdriverIO.Browser,
  direction: 'up' | 'down',
  distance: number = SWIPE_CONFIG.MEDIUM_DISTANCE,
  duration: number = GESTURE_TIMING.STANDARD_GESTURE,
  mute: boolean = false
): Promise<void> {

  const { x, startY } = await getScreenDimensions(client);
  const endY = direction === 'up' ? startY - distance : startY + distance;

  try {
    await client.performActions([
      {
        type: 'pointer',
        id: TOUCH_CONFIG.FINGER_ID,
        parameters: { pointerType: TOUCH_CONFIG.POINTER_TYPE },
        actions: [
          { type: TOUCH_CONFIG.ACTIONS.POINTER_MOVE, x, y: startY, duration: TOUCH_CONFIG.INSTANT_DURATION },
          { type: TOUCH_CONFIG.ACTIONS.POINTER_DOWN },
          { type: TOUCH_CONFIG.ACTIONS.PAUSE, duration },
          { type: TOUCH_CONFIG.ACTIONS.POINTER_MOVE, x, y: endY, duration: GESTURE_TIMING.POINTER_MOVE_DURATION },
          { type: TOUCH_CONFIG.ACTIONS.POINTER_UP },
        ],
      },
    ]);
    // Allows tester to mute console output if needed (too verbose in some tests)
    if (!mute) {
      console.debug(`Swipe ${direction} performed successfully.`);
    }
  } catch (error) {
    throw new Error(DYNAMIC_ERRORS.swipeDirectionFailed(direction, error));
  }
}


/**
 * (Android only - defaults to swipeIntoView on iOS) Scrolls automatically until a TextView with the given text is visible,
 * using Appium's UiScrollable to automatically scroll and search for the text, rather than a fixed scroll distance.
 * Useful for reliably locating elements in long or dynamic lists.
 * @param client - The WebDriver client instance.
 * @param text - The text to bring into view.
 * @param contains - If true, uses textContains instead of exact text match. Default: false.
 * @param goUp - If true, scrolls up (backward) instead of down (forward). Default: false.
 * @returns The ChainablePromiseElement element if found, otherwise throws an error.
 */
export async function autoScrollTextIntoView(
  client: WebdriverIO.Browser,
  text: string,
  contains: boolean = false,
  goUp: boolean = false
): Promise<ChainablePromiseElement> {
  // Check if platform is iOS - if so, use swipeIntoView instead
  if (process.env.PLATFORM === 'ios') {
    // flip around directions
    const direction = goUp ? 'down' : 'up';
    const found = await swipeIntoView(client, direction, text);
    if (found) {
      const selector = SELECTORS.TEXT_SELECTORS.exactText(text);
      return await client.$(selector);
    }
  }
  
  // Android logic - use UiScrollable
  const selectorForScroll = contains 
    ? SELECTORS.SCROLL_SELECTORS.scrollToTextContains(text, goUp)
    : SELECTORS.SCROLL_SELECTORS.scrollToText(text, goUp);
    
  const element = await client.$(selectorForScroll);
  try {
    await element.waitForDisplayed();
    console.debug(`Scrolled into view (${goUp ? 'up' : 'down'}): "${text}"${contains ? ' (contains)' : ''}`);
    return element;
  } catch (error) {
    throw new Error(DYNAMIC_ERRORS.textNotFound(text));
  }
}


/**
 * Scrolls with a fixed distance and number of attempts until the element with the given text is visible.
 * Allows more precise control than automatic scrolling in autoScrollTextIntoView.
 * @param client - The WebDriver client instance.
 * @param direction - 'up' to swipe up, 'down' to swipe down.
 * @param text - The text to bring into view.
 * @param contains - If true, uses textContains instead of exact text match. Default: false.
 * @param maxAttempts - Maximum number of swipe attempts.
 * @param swipeDistance - Distance to swipe each time.
 * @returns true if the element is found, false otherwise.
 */
export async function swipeIntoView(
  client: WebdriverIO.Browser,
  direction: 'up' | 'down',
  text: string,
  contains: boolean = false,
  maxAttempts: number = SWIPE_ATTEMPTS.DEFAULT_MAX_ATTEMPTS,
  swipeDistance: number = SWIPE_CONFIG.TEXT_SCROLL_DISTANCE
): Promise<boolean> {
  let selector: string;
  if (contains) {
    selector = SELECTORS.TEXT_SELECTORS.containsText(text);
  } else {
    selector = SELECTORS.TEXT_SELECTORS.exactText(text);
  }
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const element = await client.$(selector);
    
    // Use platform-aware visibility check
    const isVisible = await isElementVisibleOnScreen(client, element);
    if (isVisible) {
      console.log(SUCCESS_MESSAGES.elementFoundAfterSwipes(text, attempt));
      return true;
    }
    // Only swipe if not visible
    await swipeUpOrDown(client, direction, swipeDistance, SWIPE_CONFIG.TEXT_SCROLL_DISTANCE, true);
  }
  throw new Error(DYNAMIC_ERRORS.elementNotFoundAfterSwipes(text, maxAttempts));
}