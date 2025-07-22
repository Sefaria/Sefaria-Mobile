/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Constants Module Index - Central Import Point
 * 
 * DESCRIPTION:
 *  - Re-exports all constants from individual files for convenient importing
 *  - Provides a single entry point for all testing framework constants
 * USAGE:
 *  - Import specific constants: import { SELECTORS, TIMEOUTS } from '../constants'
 *  - Import everything: import * as CONSTANTS from '../constants'
 * ──────────────────────────────────────────────────────────────
 */

// Error constants and text constants (existing)
export * from './error_constants';
export * from './text_constants';

// New organized constants
export * from './selectors';
export * from './timeouts';
export * from './gestures';
export * from './colors';

// Convenience object exports for namespace-style imports
export * as SELECTORS from './selectors';
export * as TIMEOUTS from './timeouts';
export * as GESTURES from './gestures';
export * as COLORS from './colors';
export * as ERRORS from './error_constants';
export * as TEXTS from './text_constants';
