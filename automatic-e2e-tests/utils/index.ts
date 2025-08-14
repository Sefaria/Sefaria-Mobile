/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Utils Index - Central Export Point
 * 
 * DESCRIPTION:
 *  - Automatically exports all utility modules with standardized naming.
 *  - Provides a single import point for all utility helpers.
 * USAGE:
 *  - Import utils using: import { Gesture, TextFinder, UiChecker } from '../utils';
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
export const BrowserstackReport = browserstackReport;
export const Gesture = gesture;
export const HelperFunctions = helperFunctions;
export const LoadCredentials = loadCredentials;
export const OfflinePopUp = offlinePopUp;
export const SefariaAPI = sefariaAPI;
export const TextFinder = textFinder;
export const UiChecker = uiChecker;