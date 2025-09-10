/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: UI Color and Pixel Validation Utilities for Testing Framework
 * 
 * DESCRIPTION:
 *  - Compact helper functions to validate pixel colors of UI elements and viewgroups.
 *  - Includes screenshot capture, color comparison, and debug image saving.
 * USAGE:
 *  - Used in visual regression and UI validation tests.
 * ──────────────────────────────────────────────────────────────
 */

import type { Browser } from 'webdriverio';
import { PNG } from 'pngjs';
import * as fs from 'fs';
import { HelperFunctions } from '.';
import { Errors, logError, Selectors, Colors, PLATFORM } from '../constants';


// CORE PIXEL VALIDATION UTILITIES

/**
 * Extracts element bounds from bounds attribute string - Cross-platform compatible.
 * Handles both Android bounds format [x1,y1][x2,y2] and iOS rect format {"x":0,"y":0,"width":393,"height":852}
 */
function parseBounds(boundsStr: string | object): { x1: number; y1: number; x2: number; y2: number } {
  // Handle iOS rect format - could be already parsed object or JSON string
  if (typeof boundsStr === 'object' && boundsStr !== null) {
    // iOS WebDriver returns rect as an object, not a string
    const rectObj = boundsStr as any;
    if ('x' in rectObj && 'y' in rectObj && 'width' in rectObj && 'height' in rectObj) {
      return {
        x1: Math.floor(rectObj.x),
        y1: Math.floor(rectObj.y),
        x2: Math.floor(rectObj.x + rectObj.width),
        y2: Math.floor(rectObj.y + rectObj.height)
      };
    }
  }
  
  // Handle string input (could be iOS JSON string or Android bounds)
  if (typeof boundsStr === 'string') {
    // Try iOS rect format as JSON string
    try {
      const rectObj = JSON.parse(boundsStr);
      if (typeof rectObj === 'object' && 'x' in rectObj && 'y' in rectObj && 'width' in rectObj && 'height' in rectObj) {
        return {
          x1: Math.floor(rectObj.x),
          y1: Math.floor(rectObj.y),
          x2: Math.floor(rectObj.x + rectObj.width),
          y2: Math.floor(rectObj.y + rectObj.height)
        };
      }
    } catch (error) {
      // Not JSON, continue to Android format parsing
    }
    
    // Try Android bounds format [x1,y1][x2,y2]
    const match = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (match) {
      const [x1, y1, x2, y2] = match.slice(1).map(Number);
      return { x1, y1, x2, y2 };
    }
  }
  
  throw new Error(logError(`Could not parse bounds (tried both iOS rect and Android bounds formats): ${JSON.stringify(boundsStr)}`));
}

/**
 * Adjusts element bounds to match screenshot coordinate system.
 * iOS often has coordinate system differences due to status bars, navigation bars, and device scaling.
 */
async function adjustBoundsForScreenshot(
  client: Browser,
  bounds: { x1: number; y1: number; x2: number; y2: number },
  screenshot: PNG
): Promise<{ x1: number; y1: number; x2: number; y2: number }> {
  if (process.env.PLATFORM === 'android') {
    return bounds;
  }
  
  // For iOS, handle potential coordinate system differences
  let adjustedBounds = bounds;
  let adjustmentReason = '';
  
  try {
    const windowSize = await client.getWindowSize();
    const scaleX = screenshot.width / windowSize.width;
    const scaleY = screenshot.height / windowSize.height;
    
    // Apply scaling if significant
    if (Math.abs(scaleX - 1) > 0.1 || Math.abs(scaleY - 1) > 0.1) {
      adjustedBounds = {
        x1: Math.floor(bounds.x1 * scaleX),
        y1: Math.floor(bounds.y1 * scaleY),
        x2: Math.floor(bounds.x2 * scaleX),
        y2: Math.floor(bounds.y2 * scaleY)
      };
      adjustmentReason = `scaled by ${scaleX.toFixed(2)}x${scaleY.toFixed(2)}`;
    }
    
    // Check for status bar adjustment if bounds exceed screenshot
    else if (bounds.x2 > screenshot.width || bounds.y2 > screenshot.height) {
      try {
        const statusBarHeight = await client.execute(() => {
          return window.screen.height - window.innerHeight;
        });
        
        if (statusBarHeight && statusBarHeight > 0 && statusBarHeight < 100) {
          adjustedBounds = {
            x1: bounds.x1,
            y1: Math.max(0, bounds.y1 - statusBarHeight),
            x2: bounds.x2,
            y2: Math.max(0, bounds.y2 - statusBarHeight)
          };
          adjustmentReason = `adjusted for ${statusBarHeight}px status bar`;
        }
      } catch (error) {
        // Silent fallback
      }
    }
    
  } catch (error) {
    // Silent fallback to original bounds
  }
  
  // Single comprehensive log message
  if (adjustmentReason) {
    console.debug(`[iOS] Bounds adjusted: [${bounds.x1},${bounds.y1}][${bounds.x2},${bounds.y2}] → [${adjustedBounds.x1},${adjustedBounds.y1}][${adjustedBounds.x2},${adjustedBounds.y2}] (${adjustmentReason})`);
  }
  
  return adjustedBounds;
}

/**
 * Creates a cropped PNG from screenshot data based on element bounds.
 * Includes bounds validation and adjustment for coordinate system differences.
 */
async function cropElementFromScreenshot(
  client: Browser,
  screenshot: PNG, 
  originalBounds: { x1: number; y1: number; x2: number; y2: number }
): Promise<PNG> {
  
  // Adjust bounds for coordinate system differences
  const bounds = await adjustBoundsForScreenshot(client, originalBounds, screenshot);
  
  // // Turn on to debug ui element cropping
  // console.debug(`Adjusted bounds: ${JSON.stringify(bounds)}`);
  
  const { x1, y1, x2, y2 } = bounds;
  let width = x2 - x1;
  let height = y2 - y1;
  
  // Validate and clamp bounds to screenshot dimensions
  const clampedX1 = Math.max(0, Math.min(x1, screenshot.width - 1));
  const clampedY1 = Math.max(0, Math.min(y1, screenshot.height - 1));
  const clampedX2 = Math.max(clampedX1 + 1, Math.min(x2, screenshot.width));
  const clampedY2 = Math.max(clampedY1 + 1, Math.min(y2, screenshot.height));
  
  width = clampedX2 - clampedX1;
  height = clampedY2 - clampedY1;
  
  if (clampedX1 !== x1 || clampedY1 !== y1 || clampedX2 !== x2 || clampedY2 !== y2) {
    console.info(`Bounds were clamped to fit screenshot. Original: [${x1},${y1}][${x2},${y2}], Clamped: [${clampedX1},${clampedY1}][${clampedX2},${clampedY2}]`);
  }

  // // Turn on to debug ui element cropping
  // console.debug(`Final crop area: x=${clampedX1}, y=${clampedY1}, width=${width}, height=${height}`);
  
  if (width <= 0 || height <= 0) {
    throw new Error(`Invalid crop dimensions: width=${width}, height=${height}. Element might be outside screenshot bounds.`);
  }
  
  const cropped = new PNG({ width, height });
  PNG.bitblt(screenshot, cropped, clampedX1, clampedY1, width, height, 0, 0);
  
  return cropped;
}

/**
 * Saves debug images when color validation fails.
 */
function saveDebugImages(cropped: PNG, screenshot: PNG, label: string, index?: number): void {
  // Get platform specific directory using absolute path from current working directory
  const dir = `${process.cwd()}/screenshots/${PLATFORM}`;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  const timestamp = Date.now();
  const prefix = index !== undefined ? `viewgroup${index}_` : '';
  const suffix = label.toLowerCase().replace(/\s/g, '_');
  
  const croppedPath = `${dir}/${prefix}${suffix}_fail_${timestamp}_cropped.png`;
  const screenshotPath = `${dir}/${prefix}${suffix}_fail_${timestamp}_screenshot.png`;
  
  fs.writeFileSync(croppedPath, PNG.sync.write(cropped));
  fs.writeFileSync(screenshotPath, PNG.sync.write(screenshot));
  
  console.error(`Debug images saved: ${croppedPath} & ${screenshotPath}`);
}

/**
 * Validates pixel color against expected value and handles debug output.
 */
function validatePixelColor(
  cropped: PNG,
  screenshot: PNG,
  pixelCoords: { cx: number; cy: number },
  expectedColorHex: string,
  threshold: number | { r: number; g: number; b: number },
  label: string,
  debugImage: boolean,
  index?: number
): boolean {
  const { cx, cy } = pixelCoords;
  const idx = (cropped.width * cy + cx) << 2;
  const actual = { r: cropped.data[idx], g: cropped.data[idx + 1], b: cropped.data[idx + 2] };
  const expected = HelperFunctions.hexToRgb(expectedColorHex);

  if (HelperFunctions.colorsAreClose(actual, expected, threshold)) {
    console.debug(`${label} matches expected color. Actual: rgb(${actual.r},${actual.g},${actual.b}), Expected: rgb(${expected.r},${expected.g},${expected.b}); Threshold (Allowed rgb distance): ${JSON.stringify(threshold)}`);
    return true;
  }

  if (debugImage) saveDebugImages(cropped, screenshot, label, index);
  
  const actualStr = `rgb(${actual.r},${actual.g},${actual.b})`;
  const expectedStr = `rgb(${expected.r},${expected.g},${expected.b})`;
  throw new Error(Errors.DYNAMIC_ERRORS.colorMismatch(actualStr, expectedStr));
}

// MAIN COLOR VALIDATION FUNCTIONS

/**
 * Core function to validate element pixel color.
 */
async function validateElementPixel(
  client: Browser,
  element: WebdriverIO.Element,
  expectedColorHex: string,
  pixelSelector: (width: number, height: number) => { cx: number; cy: number },
  debugImage: boolean = true,
  threshold: number | { r: number; g: number; b: number } = Colors.COLOR_THRESHOLDS.STANDARD_THRESHOLD,
  label: string = 'Pixel'
): Promise<boolean> {
  await element.waitForDisplayed();
  let bounds = { x1: 0, y1: 0, x2: 0, y2: 0 };
  
  if (process.env.PLATFORM === 'android') {
    const boundsAttr = await element.getAttribute('bounds');
    bounds = parseBounds(boundsAttr);
  } else {
    // For iOS, use getAttribute('rect') directly
    const rectAttr = await element.getAttribute('rect');
    bounds = parseBounds(rectAttr);
  }
  console.debug(`Element bounds: ${JSON.stringify(bounds)}`);

  const screenshotBase64 = await client.takeScreenshot();
  const screenshot = PNG.sync.read(Buffer.from(screenshotBase64, 'base64'));
  const cropped = await cropElementFromScreenshot(client, screenshot, bounds);
  
  const pixelCoords = pixelSelector(cropped.width, cropped.height);
  return validatePixelColor(cropped, screenshot, pixelCoords, expectedColorHex, threshold, label, debugImage);
}

/**
 * Core function to validate ViewGroup pixel color by index.
 */
async function validateViewGroupPixel(
  client: Browser,
  viewGroupIndex: number,
  expectedColorHex: string,
  pixelSelector: (width: number, height: number) => { cx: number; cy: number },
  debugImage: boolean = true,
  threshold: number | { r: number; g: number; b: number } = Colors.COLOR_THRESHOLDS.STANDARD_THRESHOLD,
  label: string = 'Pixel'
): Promise<boolean> {
  const selector = Selectors.VIEWGROUP_SELECTORS.byIndex(viewGroupIndex);
  const viewGroup = await client.$(selector);
  try {
    await viewGroup.waitForDisplayed();
  }
  catch (error) {
    throw new Error(logError(error + `\nViewGroup with index ${viewGroupIndex} not found. Selector: ${selector}`));
  }
  let bounds = { x1: 0, y1: 0, x2: 0, y2: 0 };
  
  if (process.env.PLATFORM === 'android') {
    const boundsAttr = await viewGroup.getAttribute('bounds');
    bounds = parseBounds(boundsAttr);
  } else {
    // For iOS, use getAttribute('rect') directly
    const rectAttr = await viewGroup.getAttribute('rect');
    bounds = parseBounds(rectAttr);
  }

  console.debug(`Element bounds: ${JSON.stringify(bounds)}`);
  
  const screenshotBase64 = await client.takeScreenshot();
  const screenshot = PNG.sync.read(Buffer.from(screenshotBase64, 'base64'));
  const cropped = await cropElementFromScreenshot(client, screenshot, bounds);
  
  const pixelCoords = pixelSelector(cropped.width, cropped.height);
  return validatePixelColor(cropped, screenshot, pixelCoords, expectedColorHex, threshold, label, debugImage, viewGroupIndex);
}

// PUBLIC FUNCTIONS


/**
 * Validates center pixel color of a ViewGroup by index.
 * @param client - The WebDriver client instance.
 * @param viewGroupIndex - The index of the ViewGroup to validate.
 * @param expectedColorHex - The expected color in hex format (e.g., '#FF0000').
 * @param debugImage - If true, saves debug images on failure (default: true).
 * @param threshold - Color threshold for comparison (default: Colors.COLOR_THRESHOLDS.STANDARD_THRESHOLD).
 * @return Promise<boolean> true if color matches, throws error on mismatch
 */
export async function validateViewGroupCenterColor(
  client: Browser,
  viewGroupIndex: number,
  expectedColorHex: string,
  debugImage: boolean = true,
  threshold: number | { r: number; g: number; b: number } = Colors.COLOR_THRESHOLDS.STANDARD_THRESHOLD
): Promise<boolean> {
  return validateViewGroupPixel(
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
 * Validates bottom pixel color of a ViewGroup by index.
 * @param client - The WebDriver client instance.
 * @param viewGroupIndex - The index of the ViewGroup to validate.
 * @param expectedColorHex - The expected color in hex format (e.g., '#FF0000').
 * @param debugImage - If true, saves debug images on failure (default: true).
 * @param threshold - Color threshold for comparison (default: Colors.COLOR_THRESHOLDS.STANDARD_THRESHOLD).
 * @return Promise<boolean> true if color matches, throws error on mismatch
 */
export async function validateViewGroupBottomColor(
  client: Browser,
  viewGroupIndex: number,
  expectedColorHex: string,
  debugImage: boolean = true,
  threshold: number | { r: number; g: number; b: number } = Colors.COLOR_THRESHOLDS.STANDARD_THRESHOLD
): Promise<boolean> {
  return validateViewGroupPixel(
    client,
    viewGroupIndex,
    expectedColorHex,
    (width, height) => ({ cx: Math.floor(width / 2), cy: height - 3 }),
    debugImage,
    threshold,
    'Bottom pixel'
  );
}

/**
 * Validates pixel color of element found by content description.
 */
export async function validateElementColorByDesc(
  client: Browser,
  contentDesc: string,
  expectedColorHex: string,
  position: 'center' | 'bottom',
  debugImage: boolean = true,
  threshold: number | { r: number; g: number; b: number } = Colors.COLOR_THRESHOLDS.STANDARD_THRESHOLD
): Promise<boolean> {
  const selector = Selectors.TEXT_SELECTORS.byDescription(contentDesc);
  const element = await client.$(selector);

  if (!(await element.waitForDisplayed())) {
    throw new Error(logError(`Element with content description "${contentDesc}" is not displayed. Selector: ${selector}`));
  }

  // Use pixel selector based on position
  const pixelSelector = position === 'center' 
    ? (width: number, height: number) => ({ cx: Math.floor(width / 2), cy: Math.floor(height / 2) })
    : (width: number, height: number) => ({ cx: Math.floor(width / 2), cy: height - 3 });
    
  // Label for logging
  const label = position === 'center' ? 'Center pixel' : 'Bottom pixel';
  
  return validateElementPixel(client, element as unknown as WebdriverIO.Element, expectedColorHex, pixelSelector, debugImage, threshold, label);
}