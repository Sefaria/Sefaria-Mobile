import { remote } from 'webdriverio';
import { Navbar, SearchPage, ReaderPage, DisplaySettings,
  TopicsPage } from '../components';
import { LoadCredentials, Gesture,
  UiChecker, TextFinder, SefariaAPI, HelperFunctions, PopUps } from '../utils';
import { Texts, Errors, TEST_TIMEOUTS,
  Colors, SWIPE_CONFIG, Selectors, SWIPE_ATTEMPTS,
  PLATFORM} from '../constants';
import '../log_init';

const NO_RESET = false; // Set to true if you want same device session to continue with each test
const buildName = HelperFunctions.getBuildName('Regression');

describe('Sefaria Mobile regression tests', function () {
  // Global test timeout for all tests in this block
  // This sets the maximum time each test can take before failing
  this.timeout(TEST_TIMEOUTS.SINGLE_TEST);
  // WebdriverIO client instance used to interact with the app
  let client: WebdriverIO.Browser;
  // Variable to hold the current test title, used for logging and reporting
  let testTitle: string;

  beforeEach(async function () {
    // Fetch the current test title
    testTitle = HelperFunctions.getTestTitle(this);
    console.log(`\n[STARTING] Running test: ${testTitle}`);
    try {
      // WebdriverIO browser instance for interacting with the Sefaria app
      client = await remote(LoadCredentials.getOpts(buildName, testTitle, NO_RESET));
      await HelperFunctions.handleSetup(client, true);
    } catch (err) {
      UiChecker.takeScreenshot(client, testTitle, 'FAIL');
      throw new Error(`[SESSION ERROR] Could not create session for test. App might not have been launched. "${testTitle}": ${err}`);
    }
  });

  afterEach(async function () {
    PopUps.stopGlobalPopupMonitor();
    await HelperFunctions.handleTeardown(client, this, testTitle);
  });


  it('T001: Navigate to Sefat Emet, Genesis, Genesis and validate text', async function () {
    // Click on Search Icon
    await Navbar.clickNavBarItem(client, Selectors.NAVBAR_SELECTORS.navItems.search);
    await TextFinder.verifyHeaderOnPage(client, 'Search');
    
    // Remove last letter of what you want to search to cause the list to pop up
    // Otherwise, the list won't update or pop up (Appium side effect)
    await SearchPage.typeIntoSearchBar(client, "Sefat Emet, Genesis, Genesi");
    // Select option from the list and verify we are on the right page
    await SearchPage.selectFromList(client, "Sefat Emet, Genesis, Genesis");
    await ReaderPage.verifyExactTitle(client, "Genesis, Bereshit 1");
    
    // Click back to prepare for next test
    await ReaderPage.clickBackButton(client);
    await client.keys('Enter');
  });

  it('T003: Navigate to Tanakh, scroll down and click Numbers', async function () {
    // Check if we are on the main page and Tanakh is present
    let tanakh = await TextFinder.verifyHeaderOnPage(client, 'Tanakh');
    await tanakh.click();

    // Verify we are on the Tanakh page
    await ReaderPage.verifyExactTitle(client, "TANAKH");
    // Scroll to Numbers section and click it
    let numbers = await Gesture.autoScrollTextIntoView(client, "Numbers");
    await numbers.click();

    // Verify we are on Numbers Chapter 1
    await ReaderPage.verifyExactTitle(client, "1");

    // Check for Hebrew / English text on the page
    await ReaderPage.findTextByAccessibilityId(client, Texts.BAMIDBAR_1.he);
    await ReaderPage.findTextByAccessibilityId(client, Texts.BAMIDBAR_1.en, true);

    // Click back to prepare for next test
    await ReaderPage.clickBackButton(client);
    await client.keys('Enter');
  });

  it('T004: Toggle Language to hebrew and see how it affects the page', async function () {
    // Verify toggle language button is present and switches to Hebrew
    await DisplaySettings.toggleLanguageButton(client, true);
    
    // After changing language do a series of tests!
    await TextFinder.verifyHeaderOnPage(client, 'Browse the Library');
    await TextFinder.findTextElement(client, "Learning Schedules");
    // Find Tanakh in the main page 
    // (The " in תנ"ך causes errors on ios, so it works with just those two letters)
    let tanakh = await TextFinder.verifyHeaderOnPage(client, 'תנ');
    await tanakh.click()

    // Verify English text is still present (does not change based on langaugeButton)
    await ReaderPage.verifyExactTitle(client, "TANAKH");
    await TextFinder.findTextElement(client,"Weekly Torah Portion");

    // Verify the new hebrew text as a result of langaugeButton
    await TextFinder.findTextElement(client, "תורה");
    // await Gesture.swipeUpOrDown(client, 'up', 300, 300);
    await TextFinder.findTextElement(client, "בריאת העולם, תחילתה של האנושות וסיפורי האבות והאמהות.");
    
    // Return back to english
    await DisplaySettings.toggleLanguageButton(client, false);
    await ReaderPage.verifyExactTitle(client, "TANAKH");
    await TextFinder.findTextElement(client, "TORAH (The Five Books of Moses)");
    await TextFinder.findTextElement(client, "Genesis");
  });

  it('T005: Veryfying colored lines in between elements', async function () {
    // Check the colors (Indexes might change with UI update and type of phone)
    await UiChecker.validateViewGroupCenterColor(client, 2, Colors.SEFARIA_COLORS.TANAKH_TEAL); 
    await UiChecker.validateViewGroupCenterColor(client, 4, Colors.SEFARIA_COLORS.MISHNAH_BLUE); 
    await UiChecker.validateViewGroupCenterColor(client, 6, Colors.SEFARIA_COLORS.TALMUD_GOLD); 
    // Check Learning Schedules color
    await UiChecker.validateViewGroupCenterColor(client, 9, Colors.SEFARIA_COLORS.CREAM_BACKGROUND);
    
    // There is an issue currently in app behind the scene that prevents great tests
    // No resource id or description exists for certain UI elements, like the colored lines
    // Thus I can only check their viewgroup by index, but index changes as I scroll, so flaky!

    //  await Gesture.autoScrollTextIntoView(client, 'Midrash');
    // // In Android, indexes change when scrolling (flaky-check scroll and indexes in appium tester)
    // await UiChecker.validateViewGroupCenterColor(client, 7, '#5D956F'); // Midrash Green
    // await UiChecker.validateViewGroupCenterColor(client, 9, '#802F3E'); // Halakhah Red
    // await UiChecker.validateViewGroupCenterColor(client, 11, '#594176'); // Kabbalah Purple
  });

  it('T006: Learning Schedules - See all button', async function () {
    // Click See All
    let learning_button = await TextFinder.findTextElement(client, "See All");
    await learning_button.click();

    // Verfiy Learning Schedule and current secular date is present (e.g Jul 9 2025)
    await TextFinder.verifyHeaderOnPage(client, "Learning Schedules");
    const currentDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).replace(/, /g, ' ');
    await TextFinder.findTextElement(client, currentDate);

    // Check the current Jewish date (e.g Tammuz 13, 5785)
    const jewishDate = HelperFunctions.getHebrewDate();
    await TextFinder.findTextElement(client, jewishDate);
    
    // Verify the blur under the Learning Schedules is there
    await TextFinder.findTextContaining(client, "Since biblical times, the Torah has been divided into sections which are read each week on a set yearly calendar.")
    
    // Verify Headers above this weeks torah portion and Haftarah are present
    await TextFinder.findTextElement(client, "Weekly Torah Portion");
    await TextFinder.findTextElement(client, "Haftarah");


    // Fetch Current Parsha and Haftarah using Sefaria's API
    const parasha = await SefariaAPI.getCurrentParashatHashavua();
    
    // Check if Parashat Hashevua is correct
    if (parasha) {
      await TextFinder.findTextElement(client, parasha.displayValue.en);
    } else {
      throw new Error(Errors.DYNAMIC_ERRORS.apiResultMismatch("Parashat Hashavua", "(missing)"));    
    }
    // Scroll to the Parashat Hashavua text (Ensures it is visible)
    const haftarah = await SefariaAPI.getCurrentHaftarah();
    // Check if Haftarah for this week is correct
    if (haftarah) {
      await Gesture.autoScrollTextIntoView(client, haftarah.displayValue.en);
    } else {
      throw new Error(Errors.DYNAMIC_ERRORS.apiResultMismatch("Haftarah", "(haftarah!.displayValue.en)"));
    }
    
    // Scroll to Daily Learning
    await Gesture.swipeIntoView(client, SWIPE_CONFIG.DIRECTIONS.UP, "Daily Learning",);
    await TextFinder.findTextElement(client, "Daily Learning");
    await Gesture.autoScrollTextIntoView(client, "Daf Yomi");

    // Scroll to blurb about 929
    await Gesture.swipeIntoView(client, SWIPE_CONFIG.DIRECTIONS.UP, "A learning program in which participants study five of the Bible’s 929 chapters a week, completing it in about three and a half years.");
    await TextFinder.findTextElement(client, "929");

    // Scroll to Daily Rambam (3 Chapters)
    await Gesture.swipeIntoView(client, SWIPE_CONFIG.DIRECTIONS.UP, "Daily Rambam (3 Chapters)");
    await TextFinder.findTextElement(client, "Daily Rambam");
    
    // Scroll all the way to bottom and navigate to daf a week
    await Gesture.swipeIntoView(client, SWIPE_CONFIG.DIRECTIONS.UP, "Daf a Week", false, SWIPE_ATTEMPTS.DEFAULT_MAX_ATTEMPTS, SWIPE_CONFIG.PAGE_SCROLL_DISTANCE);
    await TextFinder.findTextElement(client, "Weekly Learning");

    // Get the clickable element of CURRENT_WEEKLY_DAF
    const CURRENT_WEEKLY_DAF = await TextFinder.findTextElement(client, "Daf a Week");

    // Get the current Daf a Week FROM Sefaria API and swipe it into view
    const DAF_A_WEEK = await SefariaAPI.getCurrentDafAWeek();
    await Gesture.swipeIntoView(client, SWIPE_CONFIG.DIRECTIONS.UP, DAF_A_WEEK!.displayValue.en);
    if (DAF_A_WEEK) {
      await TextFinder.findTextElement(client, DAF_A_WEEK.displayValue.en);
    } else {
      throw new Error(Errors.DYNAMIC_ERRORS.apiResultMismatch("Daf a Week", "(missing)"));
    }
    
    // Navigate to the Daf a Week section
    await CURRENT_WEEKLY_DAF.click();
    
    // Check if we are in Talmud
    await TextFinder.findTextElement(client, "The William Davidson Talmud")
    await TextFinder.findTextContaining(client, DAF_A_WEEK!.displayValue.en)

    // Extract the number after the space in DAF_A_WEEK.displayValue.en (e.g., "Bava Metzia 10" -> "10")
    const dafNumberMatch = DAF_A_WEEK!.displayValue.en.match(/\s(\d+)$/);
    const dafNumber = dafNumberMatch ? dafNumberMatch[1] : null;
    // Wait for current daf title to appear (e.g 37A)
    await ReaderPage.verifyTitleContains(client, dafNumber!);

    // Click back to prepare for next test
    await ReaderPage.clickBackButton(client);
    // await client.keys('Enter');
  });

  it('TC021: Texts tab book category sub-page', async function () {
    // Click on Mishna
    let mishna = await TextFinder.verifyHeaderOnPage(client, Texts.MISHNAH.en);
    await mishna.click();

    // check we are on the Mishna page
    await ReaderPage.verifyExactTitle(client, "MISHNAH");

    // Check if part of the blurb is present
    await TextFinder.findTextContaining(client, Texts.MISHNAH.blurb);

    // Check if dividing line under the First SEDER ZERAIM is present
    await UiChecker.validateViewGroupCenterColor(client, 2, Colors.SEFARIA_COLORS.LINE_GRAY); 

    // Check if the sefers below the sub categories (e.g. Seder Zeraim) has appropriate short blurb 
    await TextFinder.verifyHeaderOnPage(client, Texts.MISHNAH.content_desc.berakot.title);
    await TextFinder.findTextElement(client, Texts.MISHNAH.content_desc.berakot.blurb);
    await TextFinder.verifyHeaderOnPage(client, Texts.MISHNAH.content_desc.peah.title);
    await TextFinder.findTextElement(client, Texts.MISHNAH.content_desc.peah.blurb);

    // Scroll down the screen to see all the Sederim are present
    for (const seder of Texts.MISHNAH.sedarim) {
      await Gesture.swipeIntoView(client, SWIPE_CONFIG.DIRECTIONS.UP, seder, false, SWIPE_ATTEMPTS.MAX_SCROLL_ATTEMPTS, SWIPE_CONFIG.TEXT_SCROLL_DISTANCE);
      await TextFinder.findTextElement(client, seder);
    }
  });

  it('TC022: Dedication tab and results in hebrew and english', async function () {
    // Scroll strongly all the way to bottom where dedication is 
    await Gesture.swipeIntoView(client, SWIPE_CONFIG.DIRECTIONS.UP, "Dedicated in honor of", true, SWIPE_ATTEMPTS.MAX_SCROLL_ATTEMPTS, SWIPE_CONFIG.LONG_DISTANCE);

    // Look for Dedication button and click it
    let dedication_button = await TextFinder.findTextContaining(client, "Dedicated in honor of")
    await dedication_button.click();

    // Check if Header of Dedication is present
    await TextFinder.findTextElement(client, "Sefaria App for iOS and Android")

    // Check if dedication message is there
    await TextFinder.findTextContaining(client, "Dedicated in honor of ");

    // Scroll to bottom of the dedication pop up
    await Gesture.swipeUpOrDown(client, SWIPE_CONFIG.DIRECTIONS.UP, SWIPE_CONFIG.LONG_DISTANCE, SWIPE_CONFIG.FAST_SCROLL_DISTANCE);
    
    // Check if the hebrew torah quote on bottom of dedication is present
    await TextFinder.findTextElement(client, "יגיע כפיך כי תאכל אשריך וטוב לך");
    await TextFinder.findTextContaining(client, 'תהילים קכ');

    // Scroll back up to see the x button
    await Gesture.swipeUpOrDown(client, SWIPE_CONFIG.DIRECTIONS.DOWN, SWIPE_CONFIG.LONG_DISTANCE, SWIPE_CONFIG.FAST_SCROLL_DISTANCE);

    // Close the pop-up
    await Navbar.closePopUp(client);

    // Verify we are back on the main page
    await TextFinder.verifyHeaderOnPage(client, 'Browse the Library');

    // navigate to Account
    await Navbar.clickNavBarItem(client, Selectors.NAVBAR_SELECTORS.navItems.account);
    await TextFinder.verifyHeaderOnPage(client, 'Account');

    // Change language to Hebrew
    let hebrew_button = await TextFinder.findTextElement(client, "עברית");
    await hebrew_button.click();

    // Verify the language has changed
    dedication_button = await TextFinder.findTextContaining(client, "נתרם לכבודם");
    await dedication_button.click();

    // Verify Hebrew Header of Dedication is present
    await TextFinder.findTextElement(client, "האפליקציה של ספריא עבור אנדרואיד ו-iOS");

    // Check if dedication message is there in Hebrew
    await TextFinder.findTextContaining(client, "מוקדש לכבודם של");

    // Close the pop-up
    await Navbar.closePopUp(client);

    // Change language back to English
    let english_button = await TextFinder.findTextElement(client, "English");
    await english_button.click();

    // Verify we are back in English
    await TextFinder.verifyHeaderOnPage(client, 'Account');

  });

  it('TC023: Topics tab comprehensive test, navigating between sources and sheets', async function () {
    // Click on Topics
    await Navbar.clickNavBarItem(client, Selectors.NAVBAR_SELECTORS.navItems.topics);
    // Check if we are on the Topics page
    await TextFinder.verifyHeaderOnPage(client, 'Explore by Topic');

    let prayer_button = await TextFinder.findTextElement(client, "Prayer");
    await prayer_button.click();

    // Check if we are on the Prayer page
    await TextFinder.findTextElement(client, "Prayer");

    // Navigate to Aleinu
    let aleinu_button = await TextFinder.findTextElement(client, Texts.ALEINU.en);
    await aleinu_button.click();

    await TopicsPage.verifyTopicTitle(client, Texts.ALEINU.en);
    
    // Check if the PRAYER subheader is present
    await TopicsPage.verifyTopicCategory(client, "PRAYER");

    // Check if the Aleinu blurb is present
    await TopicsPage.verifyTopicBlurb(client, Texts.ALEINU.blurb);

    // Assert we are sources page by seeing if SOURCES is underlines bold
    await TextFinder.findTextElement(client, "Sources");
    // Screenshot Sources element to check underline
    await UiChecker.validateElementColorByDesc(client, 'Sources', Colors.SEFARIA_COLORS.PALE_GRAY, "bottom"); 
    // Check if Sheets is white
    await UiChecker.validateElementColorByDesc(client, 'Sheets', Colors.SEFARIA_COLORS.OFF_WHITE, "bottom"); 
    
    // Move to sheets section and click it
    await TopicsPage.clickSheets(client);
    // Check if it is now underlined and sources is white
    await UiChecker.validateElementColorByDesc(client, 'Sources', Colors.SEFARIA_COLORS.OFF_WHITE, "bottom"); 
    await UiChecker.validateElementColorByDesc(client, 'Sheets', Colors.SEFARIA_COLORS.PALE_GRAY, "bottom"); 
    
    // Move back to sources page
    await TopicsPage.clickSources(client);
    
    // Click three dots and verify source connection appears
    await TopicsPage.clickThreeDotsMenu(client);
    await TextFinder.findTextContaining(client, Texts.ALEINU.connection);
    await TopicsPage.clickThreeDotsMenu(client); // Close the three dots menu

    // Type into search bar
    await SearchPage.typeIntoSearchBar(client, Texts.ALEINU.first_source);
    // Press Enter on keyboard
    await client.keys('Enter');

    // await clickElementWithSelector(client, Selectors.TOPICS_SELECTORS.searchButton);

    // Click on the first source (Siddur Ashkenaz)
    (await TextFinder.findTextElement(client, Texts.ALEINU.first_source)).click()
    // Verify title 
    await ReaderPage.verifyExactTitle(client, Texts.ALEINU.first_source_header);
    await ReaderPage.clickBackButton(client);

    // Verify we are on Aleinu Topic paGE AGAIN
    await TopicsPage.verifyTopicTitle(client, Texts.ALEINU.en);

    // Scroll down to find Related Topics to Aleinu (iOS and Android have different capitalized "to")
    await Gesture.autoScrollTextIntoView(client, Texts.ALEINU.topics_related(PLATFORM as "ios" | "android"), true);
    await Gesture.swipeIntoView(client, SWIPE_CONFIG.DIRECTIONS.UP, "Bowing");

    (await TextFinder.findTextElement(client, "Bowing")).click()
    // Verify we are on Bowing Topic page
    await TopicsPage.verifyTopicTitle(client, "Bowing");
    // Go back to Aleinu Topic page
    await TopicsPage.navigateBackFromTopic(client);
    // Verify we are back on Aleinu Topic page
    await TopicsPage.verifyTopicTitle(client, Texts.ALEINU.en);

    // Click Sheets
    await TopicsPage.clickSheets(client);
    // Assert Search bar is present and empty
    await SearchPage.verifyEmptySearchBar(client);
    // Type into search bar
    await SearchPage.typeIntoSearchBar(client, Texts.ALEINU.sheets_search);
    // Press 'X' to clear search bar
    await client.keys('Enter');
    await SearchPage.clearSearchBar(client);

    // Verify the search bar is empty
    await SearchPage.verifyEmptySearchBar(client);
  });
  
  // Add more tests here...
});