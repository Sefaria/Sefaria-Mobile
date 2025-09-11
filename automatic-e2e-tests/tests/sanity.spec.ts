import { remote } from 'webdriverio';
import { Navbar } from '../components';
import { LoadCredentials, HelperFunctions, TextFinder, BrowserstackReport, UiChecker } from '../utils';
import { TEST_TIMEOUTS, Selectors } from '../constants';
import { DisplaySettings, SearchPage, ReaderPage } from '../components';
import { PopUps } from '../utils';
import '../log_init';


const NO_RESET = false;
const buildName = HelperFunctions.getBuildName(`Sanity`);
const SuiteName = 'Sanity Suite Tests for Sefaria Mobile';

describe('Sefaria Mobile sanity checks', function () {
  this.timeout(TEST_TIMEOUTS.SINGLE_TEST);
  let client: WebdriverIO.Browser;
  let testTitle: string;

  before(async function () {
    client = await remote(LoadCredentials.getOpts(buildName, SuiteName, NO_RESET));
    console.log(`[SANITY START] ${SuiteName}`);
    await HelperFunctions.handleSetup(client, true);
  });

  beforeEach(async function () {
    testTitle = HelperFunctions.getTestTitle(this);
    console.log(`[STARTING] Running test: ${testTitle}`);
    try {
      await Navbar.clickNavBarItem(client, Selectors.NAVBAR_SELECTORS.navItems.texts);
    } catch (error) {
      // Take screenshot on setup failure
      UiChecker.takeScreenshot(client, testTitle, 'FAIL');
    }
  });

  afterEach(async function () {
    // Use the same teardown as regression tests, but don't delete session
    await HelperFunctions.handleTeardown(client, this, testTitle, false);
    // Add BrowserStack annotations for individual test tracking
    if (process.env.RUN_ENV === 'browserstack') {
      const testStatus = this.currentTest?.state === 'passed' ? 'passed' : 'failed';
      const reason = this.currentTest?.err?.message ?? undefined;
      
      await BrowserstackReport.annotateBrowserstackTest(client, testTitle, testStatus, reason);
    }
  });

  after(async function () {
    if (client) {
      // Set final suite status for BrowserStack
      if (process.env.RUN_ENV === 'browserstack') {
        const tests = this.test?.parent?.tests || [];
        await BrowserstackReport.setBrowserstackSuiteStatus(client, tests, 'Sanity Suite');
      }
      
      // Now delete the session
      try {
        // Stop the popup monitor during teardown
        PopUps.stopGlobalPopupMonitor();
        await client.deleteSession();
        // await HelperFunctions.handleTeardown(client, this, testTitle);
      } catch (err) {
        console.error('Failed to close session:', err);
      }
    }
  });

  it('S001: App launches and main header is present', async function () {
    await TextFinder.verifyHeaderOnPage(client, 'Browse the Library');
  });

  it('S002: Search opens from navbar and is empty', async function () {
    await Navbar.clickNavBarItem(client, Selectors.NAVBAR_SELECTORS.navItems.search);
    await TextFinder.verifyHeaderOnPage(client, 'Search');
    await SearchPage.verifyEmptySearchBar(client);
    await client.keys('Enter');
  });

  it('S003: cycle through pages through Navigation Bar', async function () {
    // Ensure navbar is visible and can click Texts and Topics
    await Navbar.clickNavBarItem(client, Selectors.NAVBAR_SELECTORS.navItems.topics);
    await TextFinder.verifyHeaderOnPage(client, 'Explore by Topic');
    await Navbar.clickNavBarItem(client, Selectors.NAVBAR_SELECTORS.navItems.account);
    await TextFinder.verifyHeaderOnPage(client, 'Account');
    await Navbar.clickNavBarItem(client, Selectors.NAVBAR_SELECTORS.navItems.texts);
    await TextFinder.verifyHeaderOnPage(client, 'Browse the Library');
  });
  
  it('S004: Display settings open and toggle language', async function () {
    // Toggle to Hebrew then back to English
    await DisplaySettings.toggleLanguageButton(client, true);
    // See if header is still english
    await TextFinder.verifyHeaderOnPage(client, 'Browse the Library');
    // See if Tanakh now is in Hebrew
    await TextFinder.verifyHeaderOnPage(client, 'תנ');
    // Toggle back to English
    await DisplaySettings.toggleLanguageButton(client, false);
    // Verify back to English
    await TextFinder.verifyHeaderOnPage(client, 'Tanakh');
  });

  it('S005: Open canonical text via search and verify reader title', async function () {
    await Navbar.clickNavBarItem(client, Selectors.NAVBAR_SELECTORS.navItems.search);
    await SearchPage.typeIntoSearchBar(client, 'Job 1, 1 text');
    await SearchPage.selectFromList(client, 'Job');
    // Submit search and open first result (press Enter)
    try {
      await (await TextFinder.findTextElement(client, '1')).click();
    } catch (err) {
      console.error('Failed to click on text element:', err);
      throw err; // Re-throw to fail the test
    }
    // Verify reader opened and title contains 'Job 1' and we are on chapter 1
    await TextFinder.findTextElement(client, 'Job 1');
    await ReaderPage.verifyTitleContains(client, '1');
    await ReaderPage.clickBackButton(client);
    await client.keys('Enter');
  });
});
