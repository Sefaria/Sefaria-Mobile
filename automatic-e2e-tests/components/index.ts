/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Components Index - Central Export Point
 * 
 * DESCRIPTION:
 *  - Automatically exports all component modules with standardized naming.
 *  - Provides a single import point for all page/component helpers.
 * USAGE:
 *  - Import components using: import { TopicsPage, ReaderPage } from '../components';
 * ──────────────────────────────────────────────────────────────
 */

// Import all component modules
import * as displaySettings from './display_settings';
import * as navbar from './navbar';
import * as readerPage from './reader_page';
import * as searchPage from './search_page';
import * as topicsPage from './topics_page';

// Export with standardized names
export const DisplaySettings = displaySettings;
export const Navbar = navbar;
export const ReaderPage = readerPage;
export const SearchPage = searchPage;
export const TopicsPage = topicsPage;