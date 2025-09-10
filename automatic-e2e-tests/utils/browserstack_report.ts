/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: BrowserStack Session Utilities for Testing Framework
 * 
 * DESCRIPTION:
 *  - Provides helper functions for interacting with the BrowserStack session API.
 *  - Includes utilities to set the session status (passed/failed) and report results
 *    to the BrowserStack dashboard from automated tests.
 * 
 * USAGE:
 *  - These functions are used to enhance reporting and integration with BrowserStack.
 * ──────────────────────────────────────────────────────────────
 */

import type { Browser } from 'webdriverio';


/** 
 * Sets the status of the current BrowserStack session.
 * @param client - The WebdriverIO browser instance used to execute the command.
 * @param status - The desired session status, either 'passed' or 'failed'.
 * @param reason - (Optional) A string describing the reason for the status.
 * This function uses the BrowserStack executor API to update the session status,
 * which is useful for reporting test results in the BrowserStack dashboard.
 */
export async function setBrowserstackStatus(client: Browser, status: 'passed' | 'failed', reason?: string) {
  const command = {
    action: 'setSessionStatus',
    arguments: {
      status,
      reason: reason || '',
    },
  };

  try {
    await client.executeScript(`browserstack_executor: ${JSON.stringify(command)}`, []);
  } catch (error) {
    console.error('❌ Failed to set BrowserStack session status:', error);
  }
}

export async function reportToBrowserstack(client: WebdriverIO.Browser, test: Mocha.Context): Promise<void> {
  const testStatus = test.currentTest?.state === 'passed' ? 'passed' : 'failed';
  const reason = test.currentTest?.err?.message ?? undefined;
  try {
    await setBrowserstackStatus(client, testStatus, reason);
  } catch (error) {
    console.error('❌ Failed to set BrowserStack session status:', error);
  }
}

// ...existing code...

/**
 * Annotates individual test results in BrowserStack session timeline
 * @param client WebdriverIO browser instance
 * @param testName Name of the test
 * @param testStatus Test result status
 * @param reason Optional error message
 */
export async function annotateBrowserstackTest(
  client: Browser,
  testName: string,
  testStatus: 'passed' | 'failed',
  reason?: string
): Promise<void> {
  try {
    // Mark the test name
    await client.executeScript(`browserstack_executor: ${JSON.stringify({
      action: 'annotate',
      arguments: {
        data: `Test: ${testName}`,
        level: 'info'
      }
    })}`, []);

    // Mark the result
    await client.executeScript(`browserstack_executor: ${JSON.stringify({
      action: 'annotate',
      arguments: {
        data: `Result: ${testStatus.toUpperCase()}${reason ? ` - ${reason}` : ''}`,
        level: testStatus === 'passed' ? 'info' : 'error'
      }
    })}`, []);

    console.log(`[BROWSERSTACK] Annotated ${testStatus} for test: ${testName}\n`);
  } catch (error) {
    console.error('\r❌ Failed to annotate BrowserStack test:\n', error);
  }
}

/**
 * Sets final suite status with annotation summary for BrowserStack
 * @param client WebdriverIO browser instance
 * @param tests Array of test results
 * @param suiteName Name of the test suite
 */
export async function setBrowserstackSuiteStatus(
  client: Browser,
  tests: any[],
  suiteName: string = 'Test Suite'
): Promise<void> {
  const allTestsPassed = tests.every(test => test.state === 'passed');
  const finalStatus = allTestsPassed ? 'passed' : 'failed';
  const totalTests = tests.length;
  const passedTests = tests.filter(test => test.state === 'passed').length;
  
  try {
    // Final annotation summary
    await client.executeScript(`browserstack_executor: ${JSON.stringify({
      action: 'annotate',
      arguments: {
        data: `${suiteName.toUpperCase()} COMPLETE: ${passedTests}/${totalTests} tests passed`,
        level: finalStatus === 'passed' ? 'info' : 'error'
      }
    })}`, []);

    await setBrowserstackStatus(client, finalStatus, `${suiteName} completed: ${passedTests}/${totalTests} tests passed`);
    console.log(`[BROWSERSTACK] Final session status: ${finalStatus} (${passedTests}/${totalTests} tests passed)`);
  } catch (error) {
    console.error('❌ Failed to set final BrowserStack status:', error);
  }
}