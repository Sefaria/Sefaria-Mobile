/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: BrowserStack Session Utilities for Testing Framework
 * 
 * DESCRIPTION:
 *  - Provides helper functions for interacting with the BrowserStack session API.
 *  - Includes utilities to set the session status (passed/failed) and report results
 *    to the BrowserStack dashboard from automated tests.
 * USAGE:
 *  - These functions are used to enhance reporting and integration with BrowserStack.
 * ──────────────────────────────────────────────────────────────
 * /



/**
 * Sets the status of the current BrowserStack session.
 *
 * @param client - The WebdriverIO browser instance used to execute the command.
 * @param status - The desired session status, either 'passed' or 'failed'.
 * @param reason - (Optional) A string describing the reason for the status.
 * 
 * This function uses the BrowserStack executor API to update the session status,
 * which is useful for reporting test results in the BrowserStack dashboard.
 */
export async function setBrowserStackStatus(client: WebdriverIO.Browser, status: 'passed' | 'failed', reason?: string) {
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