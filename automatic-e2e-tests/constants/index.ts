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
 *  - Import specific constants: import { Timeouts } from '../constants'
 *  - Import everything: import * as CONSTANTS from '../constants'
 *  - Set PLATFORM=android or PLATFORM=ios environment variable before importing
 * ──────────────────────────────────────────────────────────────
 */


export * from './errors';
export * from './timeouts';
export * from './gesture_constants';
export * from './colors';

// Platform detection
export const PLATFORM = process.env.PLATFORM || 'android';

// Dynamically import platform-specific selectors (ios/android)
let Selectors: any;
if (PLATFORM === 'ios') {
  Selectors = require('../selectors/ios/selectors');
} else {
  Selectors = require('../selectors/android/selectors');
}

export { Selectors };


// Convenience object exports for namespace-style imports
export * as Timeouts from './timeouts';
export * as GestureConstants from './gesture_constants';
export * as Colors from './colors';
export * as Errors from './errors';
export * as Texts from './text_constants';
