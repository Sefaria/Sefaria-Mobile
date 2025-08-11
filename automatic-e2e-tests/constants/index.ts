/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Dynamic Platform Constants Loader - Central Import Point
 * 
 * DESCRIPTION:
 *  - Dynamically loads platform-specific selectors based on PLATFORM environment variable
 *  - Re-exports all shared constants from individual files for convenient importing
 *  - Provides a single entry point for all testing framework constants
 *  - Supports both Android and iOS platforms with automatic selector switching
 * USAGE:
 *  - Import specific constants: import { NAVBAR_SELECTORS, TIMEOUTS } from '../constants'
 *  - Import everything: import * as CONSTANTS from '../constants'
 *  - Set PLATFORM=android or PLATFORM=ios environment variable before importing
 * ──────────────────────────────────────────────────────────────
 */
// Error constants and text constants (existing)
export * from './errors';
export * from './text_constants';

// New organized constants
export * from './timeouts';
export * from './gestures';
export * from './colors';

// Platform detection
export const PLATFORM = process.env.PLATFORM || 'android';

// Dynamically import platform-specific selectors (ios/android)
let SELECTORS: any;
if (PLATFORM === 'ios') {
  SELECTORS = require('../selectors/ios/selectors');
} else {
  SELECTORS = require('../selectors/android/selectors');
}


export { SELECTORS };


// Convenience object exports for namespace-style imports
export * as TIMEOUTS from './timeouts';
export * as GESTURES from './gestures';
export * as COLORS from './colors';
export * as ERRORS from './errors';
export * as TEXTS from './text_constants';
