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
import { hexToRgb, colorsAreClose } from './helper_functions';
import { DYNAMIC_ERRORS, logError, VIEWGROUP_SELECTORS, TEXT_SELECTORS, COLOR_THRESHOLDS } from '../constants';


// ═══════════════════════════════════════════════════════════════
// CORE PIXEL VALIDATION UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Extracts element bounds from bounds attribute string.
 */
function parseBounds(boundsStr: string): { x1: number; y1: number; x2: number; y2: number } {
  const match = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) throw new Error(logError(`Could not parse bounds: ${boundsStr}`));
  const [, x1, y1, x2, y2] = match.map(Number);
  return { x1, y1, x2, y2 };
}

/**
 * Creates a cropped PNG from screenshot data based on element bounds.
 */
function cropElementFromScreenshot(screenshot: PNG, bounds: { x1: number; y1: number; x2: number; y2: number }): PNG {
  const { x1, y1, x2, y2 } = bounds;
  const width = x2 - x1;
  const height = y2 - y1;
  const cropped = new PNG({ width, height });
  PNG.bitblt(screenshot, cropped, x1, y1, width, height, 0, 0);
  return cropped;
}

/**
 * Saves debug images when color validation fails.
 */
function saveDebugImages(cropped: PNG, screenshot: PNG, label: string, index?: number): void {
  const dir = 'diff-images';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  const timestamp = Date.now();
  const prefix = index !== undefined ? `viewgroup${index}_` : '';
  const suffix = label.toLowerCase().replace(/\s/g, '_');
  
  const croppedPath = `${dir}/${prefix}${suffix}_fail_${timestamp}_cropped.png`;
  const screenshotPath = `${dir}/${prefix}${suffix}_fail_${timestamp}_screenshot.png`;
  
  fs.writeFileSync(croppedPath, PNG.sync.write(cropped));
  fs.writeFileSync(screenshotPath, PNG.sync.write(screenshot));
  
  console.error(`[INFO] Debug images saved: ${croppedPath} & ${screenshotPath}`);
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
  const expected = hexToRgb(expectedColorHex);

  if (colorsAreClose(actual, expected, threshold)) {
    console.debug(`${label} matches expected color. Actual: rgb(${actual.r},${actual.g},${actual.b}), Expected: rgb(${expected.r},${expected.g},${expected.b}); Threshold (Allowed rgb distance): ${JSON.stringify(threshold)}`);
    return true;
  }

  if (debugImage) saveDebugImages(cropped, screenshot, label, index);
  
  const actualStr = `rgb(${actual.r},${actual.g},${actual.b})`;
  const expectedStr = `rgb(${expected.r},${expected.g},${expected.b})`;
  throw new Error(DYNAMIC_ERRORS.colorMismatch(actualStr, expectedStr));
}

// ═══════════════════════════════════════════════════════════════
// MAIN COLOR VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Core function to validate element pixel color.
 */
async function validateElementPixel(
  client: Browser,
  element: WebdriverIO.Element,
  expectedColorHex: string,
  pixelSelector: (width: number, height: number) => { cx: number; cy: number },
  debugImage: boolean = true,
  threshold: number | { r: number; g: number; b: number } = COLOR_THRESHOLDS.STANDARD_THRESHOLD,
  label: string = 'Pixel'
): Promise<boolean> {
  await element.waitForDisplayed();
  
  const bounds = parseBounds(await element.getAttribute('bounds'));
  const screenshotBase64 = await client.takeScreenshot();
  const screenshot = PNG.sync.read(Buffer.from(screenshotBase64, 'base64'));
  const cropped = cropElementFromScreenshot(screenshot, bounds);
  
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
  threshold: number | { r: number; g: number; b: number } = COLOR_THRESHOLDS.STANDARD_THRESHOLD,
  label: string = 'Pixel'
): Promise<boolean> {
  const selector = VIEWGROUP_SELECTORS.byIndex(viewGroupIndex);
  const viewGroup = await client.$(selector);
  await viewGroup.waitForDisplayed();
  
  const bounds = parseBounds(await viewGroup.getAttribute('bounds'));
  const screenshotBase64 = await client.takeScreenshot();
  const screenshot = PNG.sync.read(Buffer.from(screenshotBase64, 'base64'));
  const cropped = cropElementFromScreenshot(screenshot, bounds);
  
  const pixelCoords = pixelSelector(cropped.width, cropped.height);
  return validatePixelColor(cropped, screenshot, pixelCoords, expectedColorHex, threshold, label, debugImage, viewGroupIndex);
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Validates center pixel color of a ViewGroup by index.
 * @param client - The WebDriver client instance.
 * @param viewGroupIndex - The index of the ViewGroup to validate.
 * @param expectedColorHex - The expected color in hex format (e.g., '#FF0000').
 * @param debugImage - If true, saves debug images on failure (default: true).
 * @param threshold - Color threshold for comparison (default: COLOR_THRESHOLDS.STANDARD_THRESHOLD).
 * @return Promise<boolean> true if color matches, throws error on mismatch
 */
export async function validateViewGroupCenterColor(
  client: Browser,
  viewGroupIndex: number,
  expectedColorHex: string,
  debugImage: boolean = true,
  threshold: number | { r: number; g: number; b: number } = COLOR_THRESHOLDS.STANDARD_THRESHOLD
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
 * @param threshold - Color threshold for comparison (default: COLOR_THRESHOLDS.STANDARD_THRESHOLD).
 * @return Promise<boolean> true if color matches, throws error on mismatch
 */
export async function validateViewGroupBottomColor(
  client: Browser,
  viewGroupIndex: number,
  expectedColorHex: string,
  debugImage: boolean = true,
  threshold: number | { r: number; g: number; b: number } = COLOR_THRESHOLDS.STANDARD_THRESHOLD
): Promise<boolean> {
  return validateViewGroupPixel(
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
 * Validates pixel color of element found by content description.
 */
export async function validateElementColorByDesc(
  client: Browser,
  contentDesc: string,
  expectedColorHex: string,
  position: 'center' | 'bottom',
  debugImage: boolean = true,
  threshold: number | { r: number; g: number; b: number } = COLOR_THRESHOLDS.STANDARD_THRESHOLD
): Promise<boolean> {
  const selector = TEXT_SELECTORS.byDescription(contentDesc);
  const element = await client.$(selector);
  
  const pixelSelector = position === 'center' 
    ? (width: number, height: number) => ({ cx: Math.floor(width / 2), cy: Math.floor(height / 2) })
    : (width: number, height: number) => ({ cx: Math.floor(width / 2), cy: height - 1 });
    
  const label = position === 'center' ? 'Center pixel' : 'Bottom pixel';
  
  return validateElementPixel(client, element as unknown as WebdriverIO.Element, expectedColorHex, pixelSelector, debugImage, threshold, label);
}
