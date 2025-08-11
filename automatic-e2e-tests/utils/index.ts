/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Utils Index - Central Export Point
 * 
 * DESCRIPTION:
 *  - Automatically exports all utility modules with standardized naming.
 *  - Provides a single import point for all utility helpers.
 * USAGE:
 *  - Import utils using: import { GESTURE, TEXT_FINDER, UI_CHECKER } from '../utils';
 * ──────────────────────────────────────────────────────────────
 */

// Import all utility modules
import * as browserstackReport from './browserstack_report';
import * as gesture from './gesture';
import * as helperFunctions from './helper_functions';
import * as loadCredentials from './load_credentials';
import * as offlinePopUp from './offline_popup';
import * as sefariaAPI from './sefaria_api';
import * as textFinder from './text_finder';
import * as uiChecker from './ui_checker';

// Export with standardized names
export const BROWSERSTACK_REPORT = browserstackReport;
export const GESTURE = gesture;
export const HELPER_FUNCTIONS = helperFunctions;
export const LOAD_CREDENTIALS = loadCredentials;
export const OFFLINE_POPUP = offlinePopUp;
export const SEFARIA_API = sefariaAPI;
export const TEXT_FINDER = textFinder;
export const UI_CHECKER = uiChecker;