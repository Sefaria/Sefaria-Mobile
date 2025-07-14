import type { Browser } from 'webdriverio';
import { PNG } from 'pngjs';
import * as fs from 'fs';
import { colorMismatch, logError } from './constants';
import { hexToRgb, colorsAreClose } from './helper_functions';


/**
 * Checks if the center pixel of a ViewGroup at a given index matches the expected color.
 * On failure, logs the actual color and saves the cropped image and full screenshot for debugging.
 * @param client - WebdriverIO browser instance.
 * @param viewGroupIndex - The index of the ViewGroup to check (1-based).
 * @param expectedColorHex - The expected color as a hex string (e.g., "#ff0000" for red).
 * @param debugImage - Optional: if true, saves the cropped image and screenshot to android/diff-images on failure.
 * @param threshold - Color difference threshold (default 10).
 * @returns true if the center pixel matches, otherwise throws an error.
 * Purpose - UI checking for colors with debug support.
 */
export async function checkViewGroupCenterPixelColor(
  client: Browser,
  viewGroupIndex: number,
  expectedColorHex: string,
  debugImage?: boolean, // Optional: if true, save the cropped image and screenshot on failure
  threshold:  number | { r: number; g: number; b: number } = 10 // Color difference threshold for each individual (r,g,b) (default 10)
): Promise<boolean> {
  // 1. Get the element and its bounds
  const selector = `//android.widget.ScrollView/android.view.ViewGroup/android.view.ViewGroup[${viewGroupIndex}]`;
  const viewGroup = await client.$(selector);
  await viewGroup.waitForDisplayed({ timeout: 1000 });
  const boundsStr = await viewGroup.getAttribute('bounds');
  const match = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) throw new Error(logError(`Could not parse bounds: ${boundsStr}`));
  const [, x1, y1, x2, y2] = match.map(Number);

  // 2. Take a screenshot
  const screenshotBase64 = await client.takeScreenshot();
  const screenshotBuffer = Buffer.from(screenshotBase64, 'base64');
  const screenshot = PNG.sync.read(screenshotBuffer);

  // 3. Crop to the ViewGroup
  const width = x2 - x1;
  const height = y2 - y1;
  const cropped = new PNG({ width, height });
  PNG.bitblt(screenshot, cropped, x1, y1, width, height, 0, 0);

  // 4. Get the center pixel
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const idx = (cropped.width * cy + cx) << 2;
  const [r, g, b] = [cropped.data[idx], cropped.data[idx + 1], cropped.data[idx + 2]];

  // 5. Compare to expected color
  const expectedColor = hexToRgb(expectedColorHex);
  if (colorsAreClose({ r, g, b }, expectedColor, threshold)) {
    console.log(logError(`✅ Center pixel matches expected color. Actual: rgb(${r},${g},${b}), Expected: rgb(${expectedColor.r},${expectedColor.g},${expectedColor.b})`));
    return true;
  } else {
    if (debugImage) {
      const dir = 'diff-images';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const timestamp = Date.now();
      const croppedFileName = `viewgroup${viewGroupIndex}_fail_${timestamp}_cropped.png`;
      const screenshotFileName = `viewgroup${viewGroupIndex}_fail_${timestamp}_screenshot.png`;
      const croppedFilePath = `${dir}/${croppedFileName}`;
      const screenshotFilePath = `${dir}/${screenshotFileName}`;
      fs.writeFileSync(croppedFilePath, PNG.sync.write(cropped));
      fs.writeFileSync(screenshotFilePath, PNG.sync.write(screenshot));
      console.error(`ℹ️ Saved cropped image to: ${croppedFilePath}`);
      console.error(`ℹ️ Saved full screenshot to: ${screenshotFilePath}`);
    }
    const actual = `rgb(${r},${g},${b})`;
    const expected = `rgb(${expectedColor.r},${expectedColor.g},${expectedColor.b})`;
    console.error(colorMismatch(actual, expected));
    throw new Error(colorMismatch(actual, expected));
  }
}