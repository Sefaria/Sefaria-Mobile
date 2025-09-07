import { remote } from 'webdriverio';
import { Navbar } from '../components'
import { LoadCredentials, HelperFunctions, TextFinder } from '../utils';
import { TEST_TIMEOUTS, Selectors } from '../constants';
import { DisplaySettings, SearchPage, ReaderPage } from '../components';
import { PopUps } from '../utils';
import '../log_init';


const NO_RESET = false;
const buildName = HelperFunctions.getBuildName("Sanity");

describe('Sefaria Mobile sanity checks', function () {
  this.timeout(TEST_TIMEOUTS.SINGLE_TEST);
  let client: WebdriverIO.Browser;
  let testTitle: string;

  before(async function () {
    testTitle = HelperFunctions.getTestTitle(this);
    console.log(`[SANITY START] ${testTitle}`);
    client = await remote(LoadCredentials.getOpts(buildName, testTitle, NO_RESET));
    await HelperFunctions.handleSetup(client);
    // Close any popups that might appear on startup (like donation)
    await PopUps.closePopUpIfPresent(client);
    await PopUps.closePopUpIfPresent(client);

  });
  beforeEach(async function () {
    await Navbar.clickNavBarItem(client, Selectors.NAVBAR_SELECTORS.navItems.texts);
    await TextFinder.verifyHeaderOnPage(client, 'Browse the Library');
  });

  afterEach(async function () {
    await HelperFunctions.handleTeardown(client, this, HelperFunctions.getTestTitle(this));
  });

  it('S001: App launches and main header is present', async function () {
    // The default startup navigates to the Texts tab via handleSetup
    await TextFinder.verifyHeaderOnPage(client, 'Browse the Library');
  });

  it('S002: Search opens from navbar and is empty', async function () {
    await Navbar.clickNavBarItem(client, Selectors.NAVBAR_SELECTORS.navItems.search);
    await TextFinder.verifyHeaderOnPage(client, 'Search');
    await SearchPage.verifyEmptySearchBar(client);
    await PopUps.closePopUpIfPresent(client);
    await client.keys('Enter');
    await PopUps.closePopUpIfPresent(client);
  });

  it('S003: Navigation bar is present and clickable', async function () {
    // Ensure navbar is visible and can click Texts and Topics
    await PopUps.closePopUpIfPresent(client);
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
    // Quick, stable check that search -> reader works
    await Navbar.clickNavBarItem(client, Selectors.NAVBAR_SELECTORS.navItems.search);
    await SearchPage.typeIntoSearchBar(client, 'Job 1, 1 text');
    await SearchPage.selectFromList(client, 'Job');
    // Submit search and open first result (press Enter)
    // await PopUps.closePopUpIfPresent(client);
    await (await TextFinder.findTextElement(client, '1')).click();
    // await client.keys('Enter');

    // Verify reader opened and title contains 'Job 1' and we are on chapter 1
    await TextFinder.findTextElement(client, 'Job 1');
    // await PopUps.closePopUpIfPresent(client);
    // await PopUps.closePopUpIfPresent(client);
    await ReaderPage.verifyTitleContains(client, '1');
    await ReaderPage.clickBackButton(client);
    await client.keys('Enter');
  });
});
