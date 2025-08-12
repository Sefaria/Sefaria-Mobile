/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Shared Platform-Agnostic Credential and Options Loader
 * 
 * DESCRIPTION:
 *  - Dynamically loads environment variables and credentials based on platform
 *  - Provides Appium/WebdriverIO options for local and BrowserStack sessions
 *  - Supports both Android and iOS platforms with platform-specific configurations
 * USAGE:
 *  - Used to configure and start test sessions across platforms
 *  - Set PLATFORM environment variable to 'android' or 'ios'
 * ──────────────────────────────────────────────────────────────
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import { ELEMENT_TIMEOUTS, TEST_TIMEOUTS } from '../constants';

// Detect current platform from environment variable
const PLATFORM = process.env.PLATFORM || 'android';

// Load .env file from root directory only if not in GitHub Actions
if (process.env.GITHUB_ACTIONS !== 'true') {
  dotenv.config();
}

// Set platform-specific app paths based on PLATFORM
if (PLATFORM === 'ios') {
  process.env.LOCAL_APP_PATH = process.env.IOS_LOCAL_APP_PATH;
  process.env.BROWSERSTACK_APP_ID = process.env.IOS_BROWSERSTACK_APP_ID;
} else {
  process.env.LOCAL_APP_PATH = process.env.ANDROID_LOCAL_APP_PATH;
  process.env.BROWSERSTACK_APP_ID = process.env.ANDROID_BROWSERSTACK_APP_ID;
}

/**
 * Function to get Appium options based on the platform and environment.
 * Used to configure WebdriverIO/Appium for local or BrowserStack testing.
 * @param {string} [buildName] - Optional build name for BrowserStack
 * @param {string} [sessionName] - Optional session name for BrowserStack
 * @param {boolean} [noReset] - Optional no reset choice to start from new app or not (false - runs new app)
 */
export function getOpts(buildName?: string, sessionName?: string, noReset?: boolean) {
  const RUN_ENV = process.env.RUN_ENV || 'local';
  
  console.log(`[RUN] Running on ${RUN_ENV.toUpperCase()} for ${PLATFORM.toUpperCase()} platform on Device: ${process.env.DEVICE_NAME || 'Unknown'}`);
  
  let effectiveBuildName = buildName || '';
  if (process.env.DEVICE_NAME) {
    effectiveBuildName = buildName
      ? `${buildName} - ${process.env.DEVICE_NAME}`
      : process.env.DEVICE_NAME;
  } 

  if (PLATFORM === 'ios') {
    return getIOSOpts(effectiveBuildName, sessionName, noReset, RUN_ENV);
  } else {
    return getAndroidOpts(effectiveBuildName, sessionName, noReset, RUN_ENV);
  }
}

/**
 * Get Android-specific Appium options
 */
function getAndroidOpts(buildName?: string, sessionName?: string, noReset?: boolean, runEnv?: string) {
  if (runEnv === 'local') {
    const LOCAL_DEVICE_NAME = process.env.LOCAL_DEVICE_NAME || 'Android Emulator';
    const LOCAL_APP_PATH = process.env.LOCAL_APP_PATH;
    
    if (!LOCAL_APP_PATH) {
      throw new Error('LOCAL_APP_PATH must be set in android/.env for local Android testing');
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
    // BrowserStack Android configuration
    const BROWSERSTACK_USERNAME = process.env.BROWSERSTACK_USERNAME;
    const BROWSERSTACK_ACCESS_KEY = process.env.BROWSERSTACK_ACCESS_KEY;
    const BROWSERSTACK_APP_ID = process.env.BROWSERSTACK_APP_ID;

    // Verify all required variables are present
    if (!BROWSERSTACK_USERNAME || !BROWSERSTACK_ACCESS_KEY || !BROWSERSTACK_APP_ID) {
      throw new Error(`Missing required BrowserStack environment variables for Android:
        USERNAME: ${BROWSERSTACK_USERNAME ? '✓' : '✗'}
        ACCESS_KEY: ${BROWSERSTACK_ACCESS_KEY ? '✓' : '✗'}
        APP_ID: ${BROWSERSTACK_APP_ID ? '✓' : '✗'}
      `);
    }

    return {
      protocol: 'https',
      hostname: 'hub.browserstack.com',
      port: 443,
      path: '/wd/hub',
      // BrowserStack Global wait time increased to handle slow loading
      waitforTimeout: ELEMENT_TIMEOUTS.LONG_WAIT,
      capabilities: {
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:app': BROWSERSTACK_APP_ID,
        'bstack:options': {
          userName: BROWSERSTACK_USERNAME,
          accessKey: BROWSERSTACK_ACCESS_KEY,
          deviceName: process.env.BS_DEVICE || 'Google Pixel 7 Pro',
          osVersion: process.env.BS_OS_VERSION || '13.0',
          projectName: 'Sefaria App Automation',
          buildName: buildName || 'Sefaria E2E Tests Android',
          sessionName: sessionName || 'Sefaria Android Tests',
          networkLogs: true,
        }
      }
    };
  }
}

/**
 * Get iOS-specific Appium options
 */
function getIOSOpts(buildName?: string, sessionName?: string, noReset?: boolean, runEnv?: string) {
  if (runEnv === 'local') {
    const LOCAL_DEVICE_NAME = process.env.LOCAL_DEVICE_NAME || 'iPhone 14 Pro Simulator';
    const LOCAL_APP_PATH = process.env.LOCAL_APP_PATH;
    
    if (!LOCAL_APP_PATH) {
      throw new Error('LOCAL_APP_PATH must be set in ios/.env for local iOS testing');
    }
    
    return {
      protocol: 'http',
      hostname: 'localhost',
      port: 4723,
      path: '/',
      capabilities: {
        platformName: 'iOS',
        'appium:automationName': 'XCUITest',
        'appium:deviceName': LOCAL_DEVICE_NAME,
        'appium:noReset': noReset || false,
        'appium:app': LOCAL_APP_PATH,
        'appium:bundleId': 'org.sefaria.sefaria', // Update with actual iOS bundle ID
        'appium:appWaitDuration': 30000,
        // iOS-specific capabilities
        'appium:autoAcceptAlerts': false,
        'appium:autoDismissAlerts': false,
      }
    };
  } else {
    // BrowserStack iOS configuration
    const BROWSERSTACK_USERNAME = process.env.BROWSERSTACK_USERNAME;
    const BROWSERSTACK_ACCESS_KEY = process.env.BROWSERSTACK_ACCESS_KEY;
    const BROWSERSTACK_APP_ID = process.env.BROWSERSTACK_APP_ID;

    // Verify all required variables are present
    if (!BROWSERSTACK_USERNAME || !BROWSERSTACK_ACCESS_KEY || !BROWSERSTACK_APP_ID) {
      throw new Error(`Missing required BrowserStack environment variables for iOS:
        USERNAME: ${BROWSERSTACK_USERNAME ? '✓' : '✗'}
        ACCESS_KEY: ${BROWSERSTACK_ACCESS_KEY ? '✓' : '✗'}
        APP_ID: ${BROWSERSTACK_APP_ID ? '✓' : '✗'}
      `);
    }

    return {
      protocol: 'https',
      hostname: 'hub.browserstack.com',
      port: 443,
      path: '/wd/hub',
      // BrowserStack Global wait time increased to handle slow loading
      waitforTimeout: ELEMENT_TIMEOUTS.LONG_WAIT,
      capabilities: {
        platformName: 'iOS',
        'appium:automationName': 'XCUITest',
        'appium:app': BROWSERSTACK_APP_ID,
        'bstack:options': {
          userName: BROWSERSTACK_USERNAME,
          accessKey: BROWSERSTACK_ACCESS_KEY,
          deviceName: process.env.BS_DEVICE || 'iPhone 15 Pro',
          osVersion: process.env.BS_OS_VERSION || '17',
          projectName: 'Sefaria App Automation',
          buildName: buildName || 'Sefaria E2E Tests iOS',
          sessionName: sessionName || 'Sefaria iOS Tests',
          networkLogs: true,
        }
      }
    };
  }
}

// Log successful initialization
console.debug(`Load credentials initialized for ${PLATFORM.toUpperCase()} platform`);