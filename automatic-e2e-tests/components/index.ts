/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Components Index - Central Export Point
 * 
 * DESCRIPTION:
 *  - Automatically exports all component modules with standardized naming.
 *  - Provides a single import point for all page/component helpers.
 * USAGE:
 *  - Import components using: import { TOPICS_PAGE, READER_PAGE } from '../components';
 * ──────────────────────────────────────────────────────────────
 */

// Import all component modules
import * as displaySettings from './display_settings';
import * as navbar from './navbar';
import * as readerPage from './reader_page';
import * as searchPage from './search_page';
import * as topicsPage from './topics_page';

// Export with standardized names
export const DISPLAY_SETTINGS = displaySettings;
export const NAVBAR = navbar;
export const READER_PAGE = readerPage;
export const SEARCH_PAGE = searchPage;
export const TOPICS_PAGE = topicsPage;