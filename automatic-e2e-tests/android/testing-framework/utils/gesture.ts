import { textNotFound, swipeDirectionFailed } from '../utils/constants';

/**
 * Performs a swipe gesture up or down from the bottom half middle of the screen.
 * @param client - The WebDriver client instance.
 * @param direction - 'up' to swipe up, 'down' to swipe down.
 * @param distance - The distance in pixels to swipe (default: 800).
 * @param duration - The duration of the swipe in milliseconds (default: 500).
 */
export async function swipeUpOrDown(
  client: WebdriverIO.Browser,
  direction: 'up' | 'down',
  distance: number = 800,
  duration: number = 500
): Promise<void> {
  const { width, height } = await client.getWindowRect();
  const x = Math.floor(width / 2);
  const startY = Math.floor(height * 0.65);
  const endY = direction === 'up' ? startY - distance : startY + distance;

  try {
    await client.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', x, y: startY, duration: 0 },
          { type: 'pointerDown' },
          { type: 'pause', duration },
          { type: 'pointerMove', x, y: endY, duration: 50 },
          { type: 'pointerUp' },
        ],
      },
    ]);
    console.log(`✅ Swipe ${direction} performed successfully.`);
  } catch (error) {
    throw new Error(swipeDirectionFailed(direction, error));
  }
}


/**
 * Scrolls a scrollable view until a TextView with the given text is visible (Android only),
 * always scrolling down (forward) through the list by default, or up (backward) if goUp is true.
 * @param client - The WebDriver client instance.
 * @param text - The text to bring into view.
 * @param goUp - If true, scrolls up (backward) instead of down (forward). Default: false.
 * @returns The ChainablePromiseElement element if found, otherwise throws an error.
 */
export async function scrollTextIntoView(
  client: WebdriverIO.Browser,
  text: string,
  goUp: boolean = false
): Promise<ChainablePromiseElement> {
  // Choose scroll direction based on goUp parameter
  const direction = goUp ? 'scrollBackward' : 'scrollForward';
  const selector = `android=new UiScrollable(new UiSelector().scrollable(true).instance(0)).setAsVerticalList().${direction}().scrollIntoView(new UiSelector().className("android.widget.TextView").text("${text}"))`;
  const element = await client.$(selector);
  try {
    await element.waitForDisplayed({ timeout: 5000 });
    console.log(`✅ Scrolled into view (${goUp ? 'up' : 'down'}): "${text}"`);
    return element;
  } catch (error) {
    throw new Error(textNotFound(text));
  }
}








// /**
//  * Swipes down until the element with the given text is visible or max attempts reached.
//  * @param client - The WebDriver client instance.
//  * @param direction - 'up' to swipe up, 'down' to swipe down.
//  * @param text - The text to bring into view.
//  * @param maxAttempts - Maximum number of swipe attempts.
//  * @param swipeDistance - Distance to swipe each time.
//  * @returns true if the element is found, false otherwise.
//  */
// export async function swipeIntoView(
//   client: WebdriverIO.Browser,
//   direction: 'up' | 'down',
//   text: string,
//   maxAttempts: number = 5,
//   swipeDistance: number = 200
// ): Promise<boolean> {
//   const selector = `android=new UiSelector().className("android.widget.TextView").text("${text}")`;

//   for (let attempt = 1; attempt <= maxAttempts; attempt++) {
//     const element = await client.$(selector);
//     if (await element.isDisplayed().catch(() => false)) {
//       console.log(`✅ Element with text "${text}" is now visible after ${attempt} swipe(s).`);
//       return true;
//     }
//     // Only swipe if not visible
//     await swipeUpOrDown(client, direction, swipeDistance, 200);
//     await client.pause(100); // Give UI time to settle
//   }
//   console.warn(`⚠️ Element with text "${text}" not found after ${maxAttempts} swipes.`);
//   return false;
// }