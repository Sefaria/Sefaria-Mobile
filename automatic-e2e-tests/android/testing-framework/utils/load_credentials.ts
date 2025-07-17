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
    console.log("Running on LOCAL")
    const LOCAL_DEVICE_NAME = process.env.LOCAL_DEVICE_NAME || 'Android Emulator';
    // const LOCAL_APP_PATH = process.env.LOCAL_APP_PATH || 'app/sefaria_app.apk';
    return {
      protocol: 'http',
      hostname: 'localhost',
      port: 4723,
      path: '/',
      capabilities: {
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:deviceName': LOCAL_DEVICE_NAME, //Change to device name ('adb devices')
        'appium:noReset': noReset || false,
        'appium:autoGrantPermissions': true,
        'appium:appPackage': 'org.sefaria.sefaria',
        'appium:appWaitActivity': '*',
        'appium:appActivity': 'org.sefaria.sefaria.SplashActivity',
        'appium:appWaitDuration': 30000,
        'appium:adbExecTimeout': 60000
      }
    };
  } else {
    console.log("Running on BROWSERSTACK");
    const BROWSERSTACK_USERNAME = process.env.BROWSERSTACK_USERNAME || 'your_browserstack_username';
    const BROWSERSTACK_ACCESS_KEY = process.env.BROWSERSTACK_ACCESS_KEY || 'your_browserstack_access_key';
    const BROWSERSTACK_APP_ID = process.env.BROWSERSTACK_APP_ID || 'your_browserstack_app_id';
    return {
      protocol: 'http',
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
          deviceName: 'Google Pixel 7 Pro',
          osVersion: '13.0',
          projectName: 'Sefaria App Automation',
          buildName: buildName || 'Build #1',
          sessionName: sessionName || 'Launch Sefaria',
          networkLogs: true,
        }
      }
    };
  }
}