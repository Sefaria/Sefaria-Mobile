/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Centralized Gesture Configuration Constants for Testing Framework
 * 
 * DESCRIPTION:
 *  - Contains all gesture-related constants including swipe distances, coordinates, and durations
 *  - Provides consistent gesture parameters across all test components
 * USAGE:
 *  - Import gesture configs to replace hardcoded gesture values
 * ──────────────────────────────────────────────────────────────
 */

// Swipe distances and directions
export const SWIPE_CONFIG = {
  // Standard swipe distances
  SMALL_DISTANCE: 200,
  SHORT_DISTANCE: 275,
  MEDIUM_DISTANCE: 500,
  LONG_DISTANCE: 1000,
  
  // Specific use case distances
  TEXT_SCROLL_DISTANCE: 200,    // For scrolling text into view
  PAGE_SCROLL_DISTANCE: 500,    // For page-level scrolling
  FAST_SCROLL_DISTANCE: 1000,   // For quick navigation
  
  // Swipe directions
  DIRECTIONS: {
    UP: 'up' as const,
    DOWN: 'down' as const,
    LEFT: 'left' as const,
    RIGHT: 'right' as const,
  },
} as const;

// Gesture timing configuration
export const GESTURE_TIMING = {
  // Durations for different gesture types
  QUICK_GESTURE: 200,      // Fast swipes/taps
  STANDARD_GESTURE: 500,   // Normal gesture speed
  SLOW_GESTURE: 1000,      // Deliberate slow gestures
  
  // Pause durations
  MICRO_PAUSE: 50,         // Very short pause
  SHORT_PAUSE: 100,        // Brief pause between actions
  MEDIUM_PAUSE: 200,       // Standard pause
  LONG_PAUSE: 500,         // Extended pause
  
  // Pointer action timing
  POINTER_MOVE_DURATION: 50,   // Duration for pointer movement
  POINTER_DOWN_DURATION: 0,    // Instant pointer down
} as const;

// Screen position calculations
export const SCREEN_POSITIONS = {
  // Relative positions on screen (as percentages)
  CENTER_X: 0.5,
  CENTER_Y: 0.5,
  
  // Common Y positions for swipes
  UPPER_THIRD: 0.33,
  MIDDLE_THIRD: 0.5,
  LOWER_THIRD: 0.67,
  
  // Safe swipe zones (avoiding edges)
  SAFE_MARGIN: 0.1,        // 10% margin from edges
  SWIPE_START_Y: 0.8,      // Default swipe start position
  SWIPE_END_Y_UP: 0.2,     // End position for upward swipes
  SWIPE_END_Y_DOWN: 0.8,   // End position for downward swipes
} as const;

// Swipe attempt configuration
export const SWIPE_ATTEMPTS = {
  DEFAULT_MAX_ATTEMPTS: 5,     // Standard number of swipe attempts
  QUICK_ATTEMPTS: 3,           // For quick searches
  THOROUGH_ATTEMPTS: 10,       // For thorough searching
  
  // Element finding configuration
  MAX_SCROLL_ATTEMPTS: 7,      // Maximum attempts to scroll to find element
  SEARCH_RETRY_COUNT: 3,       // Retries for element searching
} as const;

// Touch action configuration
export const TOUCH_CONFIG = {
  // Touch action types
  ACTIONS: {
    POINTER_MOVE: 'pointerMove' as const,
    POINTER_DOWN: 'pointerDown' as const,
    POINTER_UP: 'pointerUp' as const,
    PAUSE: 'pause' as const,
  },
  
  // Pointer configuration
  POINTER_TYPE: 'touch' as const,
  FINGER_ID: 'finger1',
  
  // Default coordinate fallbacks
  DEFAULT_X: 500,
  DEFAULT_Y: 1000,
  
  // Duration values
  INSTANT_DURATION: 0,
} as const;
