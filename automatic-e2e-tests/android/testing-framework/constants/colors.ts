/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Centralized Color Constants for Testing Framework
 * 
 * DESCRIPTION:
 *  - Contains all color values used in UI testing and visual verification
 *  - Organized by theme, component, and usage context
 * USAGE:
 *  - Import color constants to replace hardcoded hex values in tests
 * ──────────────────────────────────────────────────────────────
 */

// Sefaria brand colors
export const SEFARIA_COLORS = {
  // Primary theme colors  
  TANAKH_TEAL: '#1f4d5d',       // Dark teal for Tanakh sections
  MISHNAH_BLUE: '#6998b4',      // Light blue for Mishnah sections
  TALMUD_GOLD: '#c8b580',       // Gold for Talmud sections
  
  // Secondary colors
  LIGHT_BLUE: '#87ceeb',        // Light blue accents
  DARK_BLUE: '#1e3a8a',         // Dark blue text/borders
  NAVY: '#0f1f3d',              // Very dark blue
  
  // Text colors
  PRIMARY_TEXT: '#000000',       // Black text
  SECONDARY_TEXT: '#666666',     // Gray text  
  LIGHT_TEXT: '#ffffff',         // White text
  
  // Background colors
  WHITE_BACKGROUND: '#ffffff',   // White backgrounds
  OFF_WHITE: '#f6f6f6',       // Off-white backgrounds
  CREAM_BACKGROUND: '#FBFBFA', // Creamy off-white background`
  LIGHT_GRAY: '#f5f5f5',        // Light gray backgrounds
  PALE_GRAY: '#999999',        // Pale gray backgrounds
  DARK_GRAY: '#333333',         // Dark gray backgrounds
} as const;

// Color tolerance thresholds for pixel comparison
export const COLOR_THRESHOLDS = {
  // RGB tolerance values for color matching
  STRICT_THRESHOLD: {
    r: 5,   // Very strict matching
    g: 5,
    b: 5,
  },
  
  STANDARD_THRESHOLD: {
    r: 10,  // Standard matching (default)
    g: 10, 
    b: 10,
  },
  
  LOOSE_THRESHOLD: {
    r: 20,  // More forgiving matching
    g: 20,
    b: 20,
  },
  
  // Simple numeric thresholds
  STRICT_NUMERIC: 5,
  STANDARD_NUMERIC: 10,
  LOOSE_NUMERIC: 20,
} as const;

// Status and state colors
export const STATUS_COLORS = {
  SUCCESS: '#28a745',    // Green for success states
  ERROR: '#dc3545',      // Red for error states  
  WARNING: '#ffc107',    // Yellow for warning states
  INFO: '#17a2b8',       // Blue for info states
  
  // Loading and disabled states
  DISABLED: '#cccccc',   // Gray for disabled elements
  LOADING: '#6c757d',    // Muted gray for loading states
} as const;

// UI component specific colors
export const COMPONENT_COLORS = {
  // Navigation
  NAV_ACTIVE: SEFARIA_COLORS.TANAKH_TEAL,
  NAV_INACTIVE: SEFARIA_COLORS.SECONDARY_TEXT,
  
  // Buttons
  PRIMARY_BUTTON: SEFARIA_COLORS.TANAKH_TEAL,
  SECONDARY_BUTTON: SEFARIA_COLORS.LIGHT_GRAY,
  
  // Highlights and selections
  SELECTION_HIGHLIGHT: SEFARIA_COLORS.LIGHT_BLUE,
  TEXT_HIGHLIGHT: '#ffff99',
  
  // Borders and dividers
  BORDER_COLOR: SEFARIA_COLORS.LIGHT_GRAY,
  DIVIDER_COLOR: '#e0e0e0',
} as const;

// Test-specific color references
export const TEST_COLORS = {
  // Colors used in current tests
  VIEWGROUP_TEST_TEAL: SEFARIA_COLORS.TANAKH_TEAL,    // Used in ViewGroup tests
  VIEWGROUP_TEST_BLUE: SEFARIA_COLORS.MISHNAH_BLUE,   // Used in ViewGroup tests
  
  // Default test colors for various checks
  DEFAULT_BACKGROUND: SEFARIA_COLORS.WHITE_BACKGROUND,
  DEFAULT_TEXT: SEFARIA_COLORS.PRIMARY_TEXT,
} as const;

// Export commonly used threshold for backward compatibility
export const THRESHOLD_RGB = COLOR_THRESHOLDS.STANDARD_THRESHOLD;
