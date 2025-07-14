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