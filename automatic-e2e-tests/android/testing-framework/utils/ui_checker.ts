/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: UI Color and Pixel Checker Utilities for Testing Framework
 * 
 * DESCRIPTION:
 *  - Helper functions to check pixel colors of UI elements and viewgroups.
 *  - Includes screenshot cropping, color comparison, and debug image saving.
 * USAGE:
 *  - Used in visual regression and UI validation tests.
 * ──────────────────────────────────────────────────────────────
 */

import type { Browser } from 'webdriverio';
import { PNG } from 'pngjs';
import * as fs from 'fs';
import { hexToRgb, colorsAreClose } from './helper_functions';
import { DYNAMIC_ERRORS, logError, VIEWGROUP_SELECTORS, TEXT_SELECTORS, ELEMENT_TIMEOUTS, COLOR_THRESHOLDS } from '../constants';


/**
 * Checks if a specific pixel of a given element matches the expected color.
 * @param element - WebdriverIO element to check.
 * @param expectedColorHex - The expected color as a hex string (e.g., "#ff0000" for red).
 * @param pixelSelector - Function to select the pixel (width, height) => { cx, cy }
 * @param debugImage - Optional: if true, saves the cropped image and screenshot to android/diff-images on failure.
 * @param threshold - Color difference threshold (default 10).
 * @param label - Label for logging and file naming.
 * @returns true if the pixel matches, otherwise throws an error.
 */
export async function checkElementPixelColor(
  client: Browser,
  element: WebdriverIO.Element,
  expectedColorHex: string,
  pixelSelector: (width: number, height: number) => { cx: number; cy: number },
  debugImage: boolean = true,
  threshold: number | { r: number; g: number; b: number } = COLOR_THRESHOLDS.STANDARD_THRESHOLD,
  label: string = 'Pixel'
): Promise<boolean> {
  await element.waitForDisplayed({ timeout: ELEMENT_TIMEOUTS.QUICK_CHECK });
  const boundsStr = await element.getAttribute('bounds');
  const match = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) throw new Error(logError(`Could not parse bounds: ${boundsStr}`));
  const [, x1, y1, x2, y2] = match.map(Number);

  // Take a screenshot using the client
  const screenshotBase64 = await client.takeScreenshot();
  const screenshotBuffer = Buffer.from(screenshotBase64, 'base64');
  const screenshot = PNG.sync.read(screenshotBuffer);

  // Crop to the element
  const width = x2 - x1;
  const height = y2 - y1;
  const cropped = new PNG({ width, height });
  PNG.bitblt(screenshot, cropped, x1, y1, width, height, 0, 0);

  // Get the target pixel
  const { cx, cy } = pixelSelector(width, height);
  const idx = (cropped.width * cy + cx) << 2;
  const [r, g, b] = [cropped.data[idx], cropped.data[idx + 1], cropped.data[idx + 2]];

  // Compare to expected color
  const expectedColor = hexToRgb(expectedColorHex);
  if (colorsAreClose({ r, g, b }, expectedColor, threshold)) {
    console.debug(`${label} matches expected color. Actual: rgb(${r},${g},${b}), Expected: rgb(${expectedColor.r},${expectedColor.g},${expectedColor.b})`);
    return true;
  } else {
    if (debugImage) {
      const dir = 'diff-images';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const timestamp = Date.now();
      const croppedFileName = `${label.toLowerCase().replace(/\s/g, '_')}_fail_${timestamp}_cropped.png`;
      const screenshotFileName = `${label.toLowerCase().replace(/\s/g, '_')}_fail_${timestamp}_screenshot.png`;
      const croppedFilePath = `${dir}/${croppedFileName}`;
      const screenshotFilePath = `${dir}/${screenshotFileName}`;
      fs.writeFileSync(croppedFilePath, PNG.sync.write(cropped));
      fs.writeFileSync(screenshotFilePath, PNG.sync.write(screenshot));
      console.error(`[INFO] Saved cropped image to: ${croppedFilePath}`);
      console.error(`[INFO] Saved full screenshot to: ${screenshotFilePath}`);
    }
    const actual = `rgb(${r},${g},${b})`;
    const expected = `rgb(${expectedColor.r},${expectedColor.g},${expectedColor.b})`;
    throw new Error(DYNAMIC_ERRORS.colorMismatch(actual, expected));
  }
}

// Internal reusable function for pixel color checking
async function checkViewGroupPixelColor(
  client: Browser,
  viewGroupIndex: number,
  expectedColorHex: string,
  pixelSelector: (width: number, height: number) => { cx: number; cy: number },
  debugImage: boolean = true,
  threshold: number | { r: number; g: number; b: number } = COLOR_THRESHOLDS.STANDARD_THRESHOLD,
  label: string = 'Pixel'
): Promise<boolean> {
  // 1. Get the element and its bounds
  const selector = VIEWGROUP_SELECTORS.byIndex(viewGroupIndex);
  const viewGroup = await client.$(selector);
  await viewGroup.waitForDisplayed({ timeout: ELEMENT_TIMEOUTS.QUICK_CHECK });
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

  // 4. Get the target pixel
  const { cx, cy } = pixelSelector(width, height);
  const idx = (cropped.width * cy + cx) << 2;
  const [r, g, b] = [cropped.data[idx], cropped.data[idx + 1], cropped.data[idx + 2]];

  // 5. Compare to expected color
  const expectedColor = hexToRgb(expectedColorHex);
  if (colorsAreClose({ r, g, b }, expectedColor, threshold)) {
    console.debug(`${label} matches expected color. Actual: rgb(${r},${g},${b}), Expected: rgb(${expectedColor.r},${expectedColor.g},${expectedColor.b})`);
    return true;
  } else {
    if (debugImage) {
      const dir = 'diff-images';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const timestamp = Date.now();
      const croppedFileName = `viewgroup${viewGroupIndex}_${label.toLowerCase().replace(/\s/g, '_')}_fail_${timestamp}_cropped.png`;
      const screenshotFileName = `viewgroup${viewGroupIndex}_${label.toLowerCase().replace(/\s/g, '_')}_fail_${timestamp}_screenshot.png`;
      const croppedFilePath = `${dir}/${croppedFileName}`;
      const screenshotFilePath = `${dir}/${screenshotFileName}`;
      fs.writeFileSync(croppedFilePath, PNG.sync.write(cropped));
      fs.writeFileSync(screenshotFilePath, PNG.sync.write(screenshot));
      console.error(`[INFO] Saved cropped image to: ${croppedFilePath}`);
      console.error(`[INFO] Saved full screenshot to: ${screenshotFilePath}`);
    }
    const actual = `rgb(${r},${g},${b})`;
    const expected = `rgb(${expectedColor.r},${expectedColor.g},${expectedColor.b})`;
    throw new Error(DYNAMIC_ERRORS.colorMismatch(actual, expected));
  }
}

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
  debugImage: boolean = true,
  threshold: number | { r: number; g: number; b: number } = COLOR_THRESHOLDS.STANDARD_THRESHOLD
): Promise<boolean> {
  return checkViewGroupPixelColor(
    client,
    viewGroupIndex,
    expectedColorHex,
    (width, height) => ({ cx: Math.floor(width / 2), cy: Math.floor(height / 2) }),
    debugImage,
    threshold,
    'Center pixel'
  );
}

/**
 * Checks if the bottom center pixel of a ViewGroup at a given index matches the expected color.
 * On failure, logs the actual color and saves the cropped image and full screenshot for debugging.
 * @param client - WebdriverIO browser instance.
 * @param viewGroupIndex - The index of the ViewGroup to check (1-based).
 * @param expectedColorHex - The expected color as a hex string (e.g., "#ff0000" for red).
 * @param debugImage - Optional: if true, saves the cropped image and screenshot to android/diff-images on failure.
 * @param threshold - Color difference threshold (default 10).
 * @returns true if the bottom pixel matches, otherwise throws an error.
 * Purpose - UI checking for colors with debug support.
 */
export async function checkViewGroupBottomPixelColor(
  client: Browser,
  viewGroupIndex: number,
  expectedColorHex: string,
  debugImage: boolean = true,
  threshold: number | { r: number; g: number; b: number } = 10
): Promise<boolean> {
  return checkViewGroupPixelColor(
    client,
    viewGroupIndex,
    expectedColorHex,
    (width, height) => ({ cx: Math.floor(width / 2), cy: height - 1 }),
    debugImage,
    threshold,
    'Bottom pixel'
  );
}

/**
 * Checks the center or bottom pixel color of an element found by content-desc.
 * @param client - WebdriverIO browser instance.
 * @param contentDesc - The content-desc of the element to find.
 * @param expectedColorHex - The expected color as a hex string.
 * @param position - 'center' or 'bottom' to select which pixel to check.
 * @param debugImage - if true, saves debug images on failure.
 * @param threshold - Color difference threshold (default 10).
 * @returns true if the pixel matches, otherwise throws an error.
 */
export async function checkElementByContentDescPixelColor(
  client: Browser,
  contentDesc: string,
  expectedColorHex: string,
  position: 'center' | 'bottom',
  debugImage: boolean = true,
  threshold: number | { r: number; g: number; b: number } = 10
): Promise<boolean> {
  const selector = TEXT_SELECTORS.byDescription(contentDesc);
  const elementPromise = client.$(selector);
  const element = await elementPromise;
  await element.waitForDisplayed({ timeout: ELEMENT_TIMEOUTS.QUICK_CHECK });
  let pixelSelector;
  let label;
  if (position === 'center') {
    pixelSelector = (width: number, height: number) => ({ cx: Math.floor(width / 2), cy: Math.floor(height / 2) });
    label = 'Center pixel';
  } else {
    pixelSelector = (width: number, height: number) => ({ cx: Math.floor(width / 2), cy: height - 1 });
    label = 'Bottom pixel';
  }
  return checkElementPixelColor(client, element as unknown as WebdriverIO.Element, expectedColorHex, pixelSelector, debugImage, threshold, label);
}



