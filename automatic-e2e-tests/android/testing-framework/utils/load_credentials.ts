/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Credential and Options Loader for Testing Framework
 * 
 * DESCRIPTION:
 *  - Loads environment variables and credentials from .env.
 *  - Provides Appium/WebdriverIO options for local and BrowserStack sessions.
 * USAGE:
 *  - Used to configure and start test sessions.
 * ──────────────────────────────────────────────────────────────
 */


import * as path from 'path';
import * as dotenv from 'dotenv';
import { TEST_TIMEOUTS } from '../constants/timeouts';

// Load .env file only if it exists (useful for local testing)
if (process.env.GITHUB_ACTIONS !== 'true') {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

/**
 * Function to get Appium options based on the environment
 * @param {string} [buildName] - Optional build name for BrowserStack
 * @param {string} [sessionName] - Optional session name for BrowserStack
 * @param {string} [noReset] - Optional no reset choice to start from new app or not (false - runs new app)
 */
export function getOpts(buildName?: string, sessionName?: string, noReset?: boolean) {
      
  const RUN_ENV = process.env.RUN_ENV || 'local';
    
  if (RUN_ENV === 'local') {
    console.log("[INFO] Running on LOCAL")
    const LOCAL_DEVICE_NAME = process.env.LOCAL_DEVICE_NAME || 'Android Emulator';
    const LOCAL_APP_PATH = process.env.LOCAL_APP_PATH;

    if (!LOCAL_APP_PATH) {
      throw new Error('LOCAL_APP_PATH must be set in .env for local testing');
    }
    return {
      protocol: 'http',
      hostname: 'localhost',
      port: 4723,
      path: '/',
      capabilities: {
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:deviceName': LOCAL_DEVICE_NAME, 
        'appium:noReset': noReset || false,
        'appium:autoGrantPermissions': true,
        'appium:app': LOCAL_APP_PATH, 
        'appium:appPackage': 'org.sefaria.sefaria',
        'appium:appWaitActivity': '*',
        'appium:appActivity': 'org.sefaria.sefaria.SplashActivity',
        'appium:appWaitDuration': 30000,
        'appium:adbExecTimeout': TEST_TIMEOUTS.ADB_EXEC
      }
    };
  } else {
    console.log("[INFO] Running on BROWSERSTACK");
    const BROWSERSTACK_USERNAME = process.env.BROWSERSTACK_USERNAME;
    const BROWSERSTACK_ACCESS_KEY = process.env.BROWSERSTACK_ACCESS_KEY;
    const BROWSERSTACK_APP_ID = process.env.BROWSERSTACK_APP_ID;

    // Verify all required variables are present
    if (!BROWSERSTACK_USERNAME || !BROWSERSTACK_ACCESS_KEY || !BROWSERSTACK_APP_ID) {
      throw new Error('Missing required BrowserStack environment variables');
    }
    // Return BrowserStack options
    return {
      protocol: 'https',
      hostname: 'hub.browserstack.com',
      port: 443,
      path: '/wd/hub',
      capabilities: {
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:app': BROWSERSTACK_APP_ID,
        'bstack:options': {
          userName: BROWSERSTACK_USERNAME,
          accessKey: BROWSERSTACK_ACCESS_KEY,
          deviceName: 'Google Pixel 6 Pro',
          osVersion: '13.0',
          projectName: 'Sefaria App Automation',
          buildName: buildName || 'Sefaria E2E Tests',
          sessionName: sessionName || 'Sefaria Tests',
          networkLogs: true,
        }
      }
    };
  }
}