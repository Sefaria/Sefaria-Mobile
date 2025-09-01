import { remote } from 'webdriverio';
import { Navbar } from '../components'
import { LoadCredentials, HelperFunctions, TextFinder } from '../utils';
import { TEST_TIMEOUTS, Selectors } from '../constants';
import { DisplaySettings, SearchPage, ReaderPage } from '../components';
import '../log_init';

const NO_RESET = false;
const buildName = HelperFunctions.getBuildName("Sanity");

describe('Sefaria Mobile sanity checks', function () {
  this.timeout(TEST_TIMEOUTS.SINGLE_TEST);
  let client: WebdriverIO.Browser;
  let testTitle: string;

  beforeEach(async function () {
    testTitle = HelperFunctions.getTestTitle(this);
    console.log(`[SANITY START] ${testTitle}`);
    client = await remote(LoadCredentials.getOpts(buildName, testTitle, NO_RESET));
    await HelperFunctions.handleSetup(client);
  });

  afterEach(async function () {
    await HelperFunctions.handleTeardown(client, this, testTitle);
  });

  it('S001: App launches and main header is present', async function () {
    // The default startup navigates to the Texts tab via handleSetup
    await TextFinder.verifyHeaderOnPage(client, 'Browse the Library');
  });

  it('S002: Search opens from navbar', async function () {
    await Navbar.clickNavBarItem(client, Selectors.NAVBAR_SELECTORS.navItems.search);
    await TextFinder.verifyHeaderOnPage(client, 'Search');
  });

  it('S003: Navigation bar is present and clickable', async function () {
    // Ensure navbar is visible and can click Texts and Topics
    await Navbar.waitForNavBar(client);
    await Navbar.clickNavBarItem(client, Selectors.NAVBAR_SELECTORS.navItems.texts);
    await TextFinder.verifyHeaderOnPage(client, 'Browse the Library');
    await Navbar.clickNavBarItem(client, Selectors.NAVBAR_SELECTORS.navItems.topics);
    await TextFinder.verifyHeaderOnPage(client, 'Explore by Topic');
  });

  it('S004: Display settings open and toggle language', async function () {
    // Toggle to Hebrew then back to English
    await DisplaySettings.toggleLanguageButton(client, true);
    await DisplaySettings.toggleLanguageButton(client, false);
    // Close display settings by clicking nav Texts
    await Navbar.clickNavBarItem(client, Selectors.NAVBAR_SELECTORS.navItems.texts);
    await TextFinder.verifyHeaderOnPage(client, 'Browse the Library');
  });

  
  it('S005: Account tab opens and search bar is empty', async function () {
    await Navbar.clickNavBarItem(client, Selectors.NAVBAR_SELECTORS.navItems.account);
    await TextFinder.verifyHeaderOnPage(client, 'Account');
    
    // Go to Search and verify empty state
    await Navbar.clickNavBarItem(client, Selectors.NAVBAR_SELECTORS.navItems.search);
    await SearchPage.verifyEmptySearchBar(client);
  });

  it('S006: Open canonical text via search and verify reader title', async function () {
    // Quick, stable check that search -> reader works
    await Navbar.clickNavBarItem(client, Selectors.NAVBAR_SELECTORS.navItems.search);
    await SearchPage.typeIntoSearchBar(client, 'Genesis 1');
    // Submit search and open first result (press Enter)
    await client.keys('Enter');

    // Verify reader opened and title contains 'Genesis 1' and we are on chapter 1
    await TextFinder.findTextElement(client, 'Genesis 1');
    await ReaderPage.verifyTitleContains(client, '1');
  });
});
