import { remote } from 'webdriverio';
import { NAVBAR, SEARCH_PAGE, READER_PAGE, DISPLAY_SETTINGS, 
  TOPICS_PAGE } from '../components'
import { LOAD_CREDENTIALS, OFFLINE_POPUP, BROWSERSTACK_REPORT, GESTURE, 
  UI_CHECKER, TEXT_FINDER, SEFARIA_API, HELPER_FUNCTIONS } from '../utils';
import { BAMIDBAR_1, ALEINU, MISHNAH, DYNAMIC_ERRORS, TEST_TIMEOUTS, 
  SEFARIA_COLORS, SWIPE_CONFIG, SELECTORS, SWIPE_ATTEMPTS, 
  PLATFORM} from '../constants';
import '../log_init'; 
import { swipeIntoView } from 'utils/gesture';

const NO_RESET = false; // Set to true if you want same device session to continue with each test
const buildName = HELPER_FUNCTIONS.getBuildName();

describe('e2e Sefaria Mobile regression tests', function () {
  // Global test timeout for all tests in this block
  // This sets the maximum time each test can take before failing
  this.timeout(TEST_TIMEOUTS.SINGLE_TEST);
  // WebdriverIO client instance used to interact with the app
  let client: WebdriverIO.Browser;
  // Variable to hold the current test title, used for logging and reporting
  let testTitle: string;

  beforeEach(async function () {
    // Fetch the current test title
    testTitle = HELPER_FUNCTIONS.getTestTitle(this);

    console.log(`[STARTING] Running test: ${testTitle}`);

    // WebdriverIO browser instance for interacting with the Sefaria app
    client = await remote(LOAD_CREDENTIALS.getOpts(buildName, testTitle, NO_RESET));

    await HELPER_FUNCTIONS.handleSetup(client)

  });

  afterEach(async function () {
    await HELPER_FUNCTIONS.handleTeardown(client, this, testTitle);
  });


  it('T001: Navigate to Sefat Emet, Genesis, Genesis and validate text', async function () {
    // Click on Search Icon
    await NAVBAR.clickNavBarItem(client, SELECTORS.NAVBAR_SELECTORS.navItems.search);
    await TEXT_FINDER.verifyHeaderOnPage(client, 'Search');
    
    // Remove last letter of what you want to search to cause the list to pop up
    // Otherwise, the list won't update or pop up (Appium side effect)
    await SEARCH_PAGE.typeIntoSearchBar(client, "Sefat Emet, Genesis, Genesi");
    // Select option from the list and verify we are on the right page
    await SEARCH_PAGE.selectFromList(client, "Sefat Emet, Genesis, Genesis");
    await READER_PAGE.verifyExactTitle(client, "Genesis, Bereshit 1");
    
    // Click back to prepare for next test
    await READER_PAGE.clickBackButton(client);
    await client.keys('Enter');
  });

  it('T003: Navigate to Tanakh, scroll down and click Numbers', async function () {
    // Check if we are on the main page and Tanakh is present
    let tanakh = await TEXT_FINDER.verifyHeaderOnPage(client, 'Tanakh');
    await tanakh.click();

    // Verify we are on the Tanakh page
    await READER_PAGE.verifyExactTitle(client, "TANAKH");
    // Scroll to Numbers section and click it
    let numbers = await GESTURE.autoScrollTextIntoView(client, "Numbers");
    await numbers.click();

    // Verify we are on Numbers Chapter 1
    await READER_PAGE.verifyExactTitle(client, "1");

    // Check for Hebrew / English text on the page
    await READER_PAGE.findTextByAccessibilityId(client, BAMIDBAR_1.he);
    await READER_PAGE.findTextByAccessibilityId(client, BAMIDBAR_1.en, true);

    // Click back to prepare for next test
    await READER_PAGE.clickBackButton(client);
    await client.keys('Enter');
  });

  it('T004: Toggle Language to hebrew and see how it affects the page', async function () {
    // Verify toggle language button is present and switches to Hebrew
    await DISPLAY_SETTINGS.toggleLanguageButton(client, true);
    
    // After changing language do a series of tests!
    await TEXT_FINDER.verifyHeaderOnPage(client, 'Browse the Library');
    await TEXT_FINDER.findTextElement(client, "Learning Schedules");
    // Find Tanakh in the main page 
    // (The " in תנ"ך causes errors on ios, so it works with just those two letters)
    let tanakh = await TEXT_FINDER.verifyHeaderOnPage(client, 'תנ');
    await tanakh.click()

    // Verify English text is still present (does not change based on langaugeButton)
    await READER_PAGE.verifyExactTitle(client, "TANAKH");
    await TEXT_FINDER.findTextElement(client,"Weekly Torah Portion");

    // Verify the new hebrew text as a result of langaugeButton
    await TEXT_FINDER.findTextElement(client, "תורה");
    // await GESTURE.swipeUpOrDown(client, 'up', 300, 300);
    await TEXT_FINDER.findTextElement(client, "בריאת העולם, תחילתה של האנושות וסיפורי האבות והאמהות.");
    
    // Return back to english
    await DISPLAY_SETTINGS.toggleLanguageButton(client, false);
    await READER_PAGE.verifyExactTitle(client, "TANAKH");
    await TEXT_FINDER.findTextElement(client, "TORAH (The Five Books of Moses)");
    await TEXT_FINDER.findTextElement(client, "Genesis");
  });

  it('T005: Veryfying colored lines in between elements', async function () {
    // Check the colors (Indexes might change with UI update and type of phone)
    await UI_CHECKER.validateViewGroupCenterColor(client, 2, SEFARIA_COLORS.TANAKH_TEAL); 
    await UI_CHECKER.validateViewGroupCenterColor(client, 4, SEFARIA_COLORS.MISHNAH_BLUE); 
    await UI_CHECKER.validateViewGroupCenterColor(client, 6, SEFARIA_COLORS.TALMUD_GOLD); 
    // Check Learning Schedules color
    await UI_CHECKER.validateViewGroupCenterColor(client, 9, SEFARIA_COLORS.CREAM_BACKGROUND);
    
    // There is an issue currently in app behind the scene that prevents great tests
    // No resource id or description exists for certain UI elements, like the colored lines
    // Thus I can only check their viewgroup by index, but index changes as I scroll, so flaky!

    //  await GESTURE.autoScrollTextIntoView(client, 'Midrash');
    // // In Android, indexes change when scrolling (flaky-check scroll and indexes in appium tester)
    // await UI_CHECKER.validateViewGroupCenterColor(client, 7, '#5D956F'); // Midrash Green
    // await UI_CHECKER.validateViewGroupCenterColor(client, 9, '#802F3E'); // Halakhah Red
    // await UI_CHECKER.validateViewGroupCenterColor(client, 11, '#594176'); // Kabbalah Purple
  });

  it('T006: Learning Schedules - See all button', async function () {
    // Click See All
    let learning_button = await TEXT_FINDER.findTextElement(client, "See All");
    await learning_button.click();

    // Verfiy Learning Schedule and current secular date is present (e.g Jul 9 2025)
    await TEXT_FINDER.verifyHeaderOnPage(client, "Learning Schedules");
    const currentDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).replace(/, /g, ' ');
    await TEXT_FINDER.findTextElement(client, currentDate);

    // Check the current Jewish date (e.g Tammuz 13, 5785)
    const jewishDate = HELPER_FUNCTIONS.getHebrewDate();
    await TEXT_FINDER.findTextElement(client, jewishDate);
    
    // Verify the blur under the Learning Schedules is there
    await TEXT_FINDER.findTextContaining(client, "Since biblical times, the Torah has been divided into sections which are read each week on a set yearly calendar.")
    
    // Verify Headers above this weeks torah portion and Haftarah are present
    await TEXT_FINDER.findTextElement(client, "Weekly Torah Portion");
    await TEXT_FINDER.findTextElement(client, "Haftarah");


    // Fetch Current Parsha and Haftarah using Sefaria's API
    const parasha = await SEFARIA_API.getCurrentParashatHashavua();
    
    // Check if Parashat Hashevua is correct
    if (parasha) {
      await TEXT_FINDER.findTextElement(client, parasha.displayValue.en);
    } else {
      throw new Error(DYNAMIC_ERRORS.apiResultMismatch("Parashat Hashavua", parasha!.displayValue.en));    
    }
    // Scroll to the Parashat Hashavua text (Ensures it is visible)
    const haftarah = await SEFARIA_API.getCurrentHaftarah();
    // Check if Haftarah for this week is correct
    if (haftarah) {
      await GESTURE.autoScrollTextIntoView(client, haftarah.displayValue.en);
    } else {
      throw new Error(DYNAMIC_ERRORS.apiResultMismatch("Haftarah", haftarah!.displayValue.en));
    }
    
    // Scroll to Daily Learning
    await GESTURE.swipeIntoView(client, SWIPE_CONFIG.DIRECTIONS.UP, "Daily Learning",);
    await TEXT_FINDER.findTextElement(client, "Daily Learning");
    await GESTURE.autoScrollTextIntoView(client, "Daf Yomi");

    // Scroll to blurb about 929
    await GESTURE.swipeIntoView(client, SWIPE_CONFIG.DIRECTIONS.UP, "A learning program in which participants study five of the Bible’s 929 chapters a week, completing it in about three and a half years.");
    await TEXT_FINDER.findTextElement(client, "929");

    // Scroll to Daily Rambam (3 Chapters)
    await GESTURE.swipeIntoView(client, SWIPE_CONFIG.DIRECTIONS.UP, "Daily Rambam (3 Chapters)");
    await TEXT_FINDER.findTextElement(client, "Daily Rambam");
    
    // Scroll all the way to bottom and navigate to daf a week
    await GESTURE.swipeIntoView(client, SWIPE_CONFIG.DIRECTIONS.UP, "Daf a Week", false, SWIPE_ATTEMPTS.DEFAULT_MAX_ATTEMPTS, SWIPE_CONFIG.PAGE_SCROLL_DISTANCE);
    await TEXT_FINDER.findTextElement(client, "Weekly Learning");

    // Get the clickable element of CURRENT_WEEKLY_DAF
    const CURRENT_WEEKLY_DAF = await TEXT_FINDER.findTextElement(client, "Daf a Week");

    // Get the current Daf a Week FROM Sefaria API and swipe it into view
    const DAF_A_WEEK = await SEFARIA_API.getCurrentDafAWeek();
    await GESTURE.swipeIntoView(client, SWIPE_CONFIG.DIRECTIONS.UP, DAF_A_WEEK!.displayValue.en);
    if (DAF_A_WEEK) {
      await TEXT_FINDER.findTextElement(client, DAF_A_WEEK.displayValue.en);
    } else {
      throw new Error(DYNAMIC_ERRORS.apiResultMismatch("Daf a Week", DAF_A_WEEK!.displayValue.en));
    }
    
    // Navigate to the Daf a Week section
    await CURRENT_WEEKLY_DAF.click();
    
    // Check if we are in Talmud
    await TEXT_FINDER.findTextElement(client, "The William Davidson Talmud")
    await TEXT_FINDER.findTextContaining(client, DAF_A_WEEK!.displayValue.en)

    // Extract the number after the space in DAF_A_WEEK.displayValue.en (e.g., "Bava Metzia 10" -> "10")
    const dafNumberMatch = DAF_A_WEEK!.displayValue.en.match(/\s(\d+)$/);
    const dafNumber = dafNumberMatch ? dafNumberMatch[1] : null;
    // Wait for current daf title to appear (e.g 37A)
    await READER_PAGE.verifyTitleContains(client, dafNumber!);

    // Click back to prepare for next test
    await READER_PAGE.clickBackButton(client);
    // await client.keys('Enter');
  });

  it('TC021: Texts tab book category sub-page', async function () {
    // Click on Mishna
    let mishna = await TEXT_FINDER.verifyHeaderOnPage(client, MISHNAH.en);
    await mishna.click();

    // check we are on the Mishna page
    await READER_PAGE.verifyExactTitle(client, "MISHNAH");

    // Check if part of the blurb is present
    await TEXT_FINDER.findTextContaining(client, MISHNAH.blurb);

    // Check if dividing line under the First SEDER ZERAIM is present
    await UI_CHECKER.validateViewGroupCenterColor(client, 2, SEFARIA_COLORS.LINE_GRAY); 

    // Check if the sefers below the sub categories (e.g. Seder Zeraim) has appropriate short blurb 
    await TEXT_FINDER.verifyHeaderOnPage(client, MISHNAH.content_desc.berakot.title);
    await TEXT_FINDER.findTextElement(client, MISHNAH.content_desc.berakot.blurb);
    await TEXT_FINDER.verifyHeaderOnPage(client, MISHNAH.content_desc.peah.title);
    await TEXT_FINDER.findTextElement(client, MISHNAH.content_desc.peah.blurb);

    // Scroll down the screen to see all the Sederim are present
    for (const seder of MISHNAH.sedarim) {
      await GESTURE.swipeIntoView(client, SWIPE_CONFIG.DIRECTIONS.UP, seder, false, SWIPE_ATTEMPTS.MAX_SCROLL_ATTEMPTS, SWIPE_CONFIG.TEXT_SCROLL_DISTANCE);
      await TEXT_FINDER.findTextElement(client, seder);
    }
  });

  it('TC022: Dedication tab and results in hebrew and english', async function () {
    // Scroll strongly all the way to bottom where dedication is 
    await GESTURE.swipeIntoView(client, SWIPE_CONFIG.DIRECTIONS.UP, "Dedicated in honor of", true, SWIPE_ATTEMPTS.MAX_SCROLL_ATTEMPTS, SWIPE_CONFIG.LONG_DISTANCE);

    // Look for Dedication button and click it
    let dedication_button = await TEXT_FINDER.findTextContaining(client, "Dedicated in honor of")
    await dedication_button.click();

    // Check if Header of Dedication is present
    await TEXT_FINDER.findTextElement(client, "Sefaria App for iOS and Android")

    // Check if dedication message is there
    await TEXT_FINDER.findTextContaining(client, "Dedicated in honor of ");

    // Scroll to bottom of the dedication pop up
    await GESTURE.swipeUpOrDown(client, SWIPE_CONFIG.DIRECTIONS.UP, SWIPE_CONFIG.LONG_DISTANCE, SWIPE_CONFIG.FAST_SCROLL_DISTANCE);
    
    // Check if the hebrew torah quote on bottom of dedication is present
    await TEXT_FINDER.findTextElement(client, "יגיע כפיך כי תאכל אשריך וטוב לך");
    await TEXT_FINDER.findTextContaining(client, 'תהילים קכ');

    // Scroll back up to see the x button
    await GESTURE.swipeUpOrDown(client, SWIPE_CONFIG.DIRECTIONS.DOWN, SWIPE_CONFIG.LONG_DISTANCE, SWIPE_CONFIG.FAST_SCROLL_DISTANCE);

    // Close the pop-up
    await NAVBAR.closePopUp(client);

    // Verify we are back on the main page
    await TEXT_FINDER.verifyHeaderOnPage(client, 'Browse the Library');

    // navigate to Account
    await NAVBAR.clickNavBarItem(client, SELECTORS.NAVBAR_SELECTORS.navItems.account);
    await TEXT_FINDER.verifyHeaderOnPage(client, 'Account');

    // Change language to Hebrew
    let hebrew_button = await TEXT_FINDER.findTextElement(client, "עברית");
    await hebrew_button.click();

    // Verify the language has changed
    dedication_button = await TEXT_FINDER.findTextContaining(client, "נתרם לכבודם");
    await dedication_button.click();

    // Verify Hebrew Header of Dedication is present
    await TEXT_FINDER.findTextElement(client, "האפליקציה של ספריא עבור אנדרואיד ו-iOS");

    // Check if dedication message is there in Hebrew
    await TEXT_FINDER.findTextContaining(client, "מוקדש לכבודם של");

    // Close the pop-up
    await NAVBAR.closePopUp(client);

    // Change language back to English
    let english_button = await TEXT_FINDER.findTextElement(client, "English");
    await english_button.click();

    // Verify we are back in English
    await TEXT_FINDER.verifyHeaderOnPage(client, 'Account');

  });

  it('TC023: Topics tab comprehensive test, navigating between sources and sheets', async function () {
    // Click on Topics
    await NAVBAR.clickNavBarItem(client, SELECTORS.NAVBAR_SELECTORS.navItems.topics);
    // Check if we are on the Topics page
    await TEXT_FINDER.verifyHeaderOnPage(client, 'Explore by Topic');

    let prayer_button = await TEXT_FINDER.findTextElement(client, "Prayer");
    await prayer_button.click();

    // Check if we are on the Prayer page
    await TEXT_FINDER.findTextElement(client, "Prayer");

    // Navigate to Aleinu
    let aleinu_button = await TEXT_FINDER.findTextElement(client, ALEINU.en);
    await aleinu_button.click();

    await TOPICS_PAGE.verifyTopicTitle(client, ALEINU.en);
    
    // Check if the PRAYER subheader is present
    await TOPICS_PAGE.verifyTopicCategory(client, "PRAYER");

    // Check if the Aleinu blurb is present
    await TOPICS_PAGE.verifyTopicBlurb(client, ALEINU.blurb);

    // Assert we are sources page by seeing if SOURCES is underlines bold
    await TEXT_FINDER.findTextElement(client, "Sources");
    // Screenshot Sources element to check underline
    await UI_CHECKER.validateElementColorByDesc(client, 'Sources', SEFARIA_COLORS.PALE_GRAY, "bottom"); 
    // Check if Sheets is white
    await UI_CHECKER.validateElementColorByDesc(client, 'Sheets', SEFARIA_COLORS.OFF_WHITE, "bottom"); 
    
    // Move to sheets section and click it
    await TOPICS_PAGE.clickSheets(client);
    // Check if it is now underlined and sources is white
    await UI_CHECKER.validateElementColorByDesc(client, 'Sources', SEFARIA_COLORS.OFF_WHITE, "bottom"); 
    await UI_CHECKER.validateElementColorByDesc(client, 'Sheets', SEFARIA_COLORS.PALE_GRAY, "bottom"); 
    
    // Move back to sources page
    await TOPICS_PAGE.clickSources(client);
    
    // Click three dots and verify source connection appears
    await TOPICS_PAGE.clickThreeDotsMenu(client);
    await TEXT_FINDER.findTextContaining(client, ALEINU.connection);
    await TOPICS_PAGE.clickThreeDotsMenu(client); // Close the three dots menu

    // Type into search bar
    await SEARCH_PAGE.typeIntoSearchBar(client, ALEINU.first_source);
    // Press Enter on keyboard
    await client.keys('Enter');

    // await clickElementWithSelector(client, SELECTORS.TOPICS_SELECTORS.searchButton);

    // Click on the first source (Siddur Ashkenaz)
    (await TEXT_FINDER.findTextElement(client, ALEINU.first_source)).click()
    // Verify title 
    await READER_PAGE.verifyExactTitle(client, ALEINU.first_source_header);
    await READER_PAGE.clickBackButton(client);

    // Verify we are on Aleinu Topic paGE AGAIN
    await TOPICS_PAGE.verifyTopicTitle(client, ALEINU.en);

    // Scroll down to find Related Topics to Aleinu (iOS and Android have different capitalized "to")
    await GESTURE.autoScrollTextIntoView(client, ALEINU.topics_related(PLATFORM as "ios" | "android"), true);
    await GESTURE.swipeIntoView(client, SWIPE_CONFIG.DIRECTIONS.UP, "Bowing");

    (await TEXT_FINDER.findTextElement(client, "Bowing")).click()
    // Verify we are on Bowing Topic page
    await TOPICS_PAGE.verifyTopicTitle(client, "Bowing");
    // Go back to Aleinu Topic page
    await TOPICS_PAGE.navigateBackFromTopic(client);
    // Verify we are back on Aleinu Topic page
    await TOPICS_PAGE.verifyTopicTitle(client, ALEINU.en);

    // Click Sheets
    await TOPICS_PAGE.clickSheets(client);
    // Assert Search bar is present and empty
    await SEARCH_PAGE.verifyEmptySearchBar(client);
    // Type into search bar
    await SEARCH_PAGE.typeIntoSearchBar(client, ALEINU.sheets_search);
    // Press 'X' to clear search bar
    await client.keys('Enter');
    await SEARCH_PAGE.clearSearchBar(client);

    // Verify the search bar is empty
    await SEARCH_PAGE.verifyEmptySearchBar(client);
  });
  
  // Add more tests here...
});