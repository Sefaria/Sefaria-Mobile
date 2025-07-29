/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Centralized Timeout Constants for Testing Framework
 * 
 * DESCRIPTION:
 *  - Contains all timeout values used throughout the testing framework
 *  - Organized by operation type and context for consistent timing
 * USAGE:
 *  - Import specific timeout values to replace hardcoded numbers
 * ──────────────────────────────────────────────────────────────
 */

// Element waiting timeouts (in milliseconds)
export const ELEMENT_TIMEOUTS = {
  // Quick checks for elements that should appear fast
  QUICK_CHECK: 1000,
  
  // Standard element waiting (most common)
  STANDARD: 4000,
  STANDARD_WAIT: 5000,
  
  // Extended waiting for slower operations
  EXTENDED: 8000,
  LONG_WAIT: 10000,
  
  // Special popup timeouts
  POPUP_WAIT: 5000,
  POPUP_EXTENDED: 15000,
  POPUP_SLOW: 25000,
} as const;

// Test execution timeouts
export const TEST_TIMEOUTS = {
  // Individual test timeout
  SINGLE_TEST: 200000, // 200 seconds
  
  // App startup and initialization
  APP_STARTUP: 60000, // 60 seconds
  
  // ADB execution timeout
  ADB_EXEC: 60000, // 60 seconds
} as const;

// Operation-specific timeouts
export const OPERATION_TIMEOUTS = {
  // Display operations
  DISPLAY_SETTINGS: ELEMENT_TIMEOUTS.STANDARD_WAIT,
  NAVBAR_WAIT: ELEMENT_TIMEOUTS.QUICK_CHECK,
  
  // Text and content loading
  TEXT_LOADING: ELEMENT_TIMEOUTS.STANDARD,
  CONTENT_LOADING: ELEMENT_TIMEOUTS.EXTENDED,
  
  // Navigation and transitions
  PAGE_TRANSITION: ELEMENT_TIMEOUTS.STANDARD_WAIT,
  POPUP_CLOSE: ELEMENT_TIMEOUTS.QUICK_CHECK,
  
  // Reader page specific
  READER_TITLE_LOAD: ELEMENT_TIMEOUTS.STANDARD_WAIT,
  READER_CONTENT_LOAD: ELEMENT_TIMEOUTS.EXTENDED,
  
  // Search and filtering
  SEARCH_RESULTS: ELEMENT_TIMEOUTS.STANDARD_WAIT,
  FILTER_APPLICATION: ELEMENT_TIMEOUTS.STANDARD,
} as const;

