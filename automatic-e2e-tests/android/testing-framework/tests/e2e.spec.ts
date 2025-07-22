import { remote } from 'webdriverio';
import { getOpts } from '../utils/load_credentials';
import { handleOfflinePopUp } from '../utils/offlinePopUp';
import { waitForNavBar, clickNavBarItem, closePopUp } from '../components/navbar';
import { typeIntoSearchBar, selectFromList} from '../components/search_page';
import { verifyExactTitle, findTextByAccessibilityId, verifyTitleContains } from '../components/reader_page'
import { toggleLanguageButton } from '../components/display_settings'
import { verifyTopicTitle, verifyTopicBlurb, verifyTopicCategory, clickSheets, clickSources, openSourceMenu } from '../components/topics_page';
import { apiResultMismatch } from '../constants/error_constants';
import { BAMIDBAR_1, ALEINU,MISHNAH } from '../constants/text_constants';
import { reportToBrowserstack } from '../utils/browserstackUtils';
import { scrollTextIntoView, swipeUpOrDown, swipeIntoView } from '../utils/gesture'
import { checkViewGroupCenterPixelColor, checkElementByContentDescPixelColor } from '../utils/ui_checker';
import { findTextElement, findHeaderInFirstViewGroup, findTextContaining, findElementByContentDesc } from '../utils/text_finder';
import { getCurrentParashatHashavua, getCurrentHaftarah, getCurrentDafAWeek  } from '../utils/sefariaAPI'
import { getHebrewDate, getCleanTestTitle } from '../utils/helper_functions'
import { TEST_TIMEOUTS } from '../constants/timeouts';
import { SEFARIA_COLORS, THRESHOLD_RGB } from '../constants/colors';
import { SWIPE_CONFIG } from '../constants/gestures';

import './test_init'; // Allows Logging and Error Handling to be written to logs_test/ directory


const no_reset = false; // Set to true if you want same device session to continue with each test
const buildName = `Sefaria E2E ${new Date().toISOString().slice(0, 10)}`;

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
    testTitle = getCleanTestTitle(this);

    console.log(`ℹ️ Running test: ${testTitle}`);

    // The client is the WebdriverIO browser instance used to interact with the app
    // It connects to the Sefaria app on the specified device or emulator
    client = await remote(getOpts(buildName, testTitle, no_reset));

    // If offline pop-up appears, click Not Now and Ok
    await handleOfflinePopUp(client);
    // Wait for first screen to load (nav bar loading signals app is ready)
    await waitForNavBar(client);
  });

  afterEach(async function () {
    if (client) {
      // If running on BrowserStack, set the session status (e.g., passed or failed)
      // Needed for proper reporting in BrowserStack
      if (process.env.RUN_ENV == 'browserstack') {
        await reportToBrowserstack(client, this);
      }
      // Close the client session
      console.log(`🎉 Finished test: ${testTitle} \n`);
      await client.deleteSession();
    }
  });

  it('T001: Navigate to Sefat Emet, Genesis, Genesis and validate text', async function () {
    // Click on Search Icon
    await clickNavBarItem(client, 'Search');
    await findHeaderInFirstViewGroup(client, 'Search');
    
    // Remove last letter of what you want to search to cause the list to pop up
    // Otherwise, the list won't update or pop up (Appium side effect)
    await typeIntoSearchBar(client, "Sefat Emet, Genesis, Genesi");
    // Select option from the list and verify we are on the right page
    await selectFromList(client, "Sefat Emet, Genesis, Genesis");
    await verifyExactTitle(client, "Genesis, Bereshit 1");
  });

  it('T003: Navigate to Tanakh, scroll down and click Numbers', async function () {
    // Check if we are on the main page and Tanakh is present
    let tanakh = await findHeaderInFirstViewGroup(client, 'Tanakh');
    await tanakh.click();

    // Verify we are on the Tanakh page
    await verifyExactTitle(client, "TANAKH");
    await scrollTextIntoView(client, "Numbers");

    // Scroll to Numbers section and click it
    let numbers = await findHeaderInFirstViewGroup(client, 'Numbers')
    await numbers.click();
    // Verify we are on Numbers Chapter 1
    await verifyExactTitle(client, "1");

    // Check for Hebrew / English text on the page
    await findTextByAccessibilityId(client, BAMIDBAR_1.he);
    await findTextByAccessibilityId(client, BAMIDBAR_1.en, true);
  });

  it('T004: Toggle Language to hebrew and see how it affects the page', async function () {
    // Verify toggle language button is present
    await toggleLanguageButton(client, true);
    
    // After changing language do a series of tests!
    await findHeaderInFirstViewGroup(client, 'Browse the Library');
    await findTextElement(client, "Learning Schedules");
    let tanakh = await findHeaderInFirstViewGroup(client, 'תנ"ך');
    await tanakh.click()

    // Verify English text is still present (does not change based on langaugeButton)
    await verifyExactTitle(client, "TANAKH");
    await findTextElement(client,"Weekly Torah Portion");

    // Verify the new hebrew text as a result of langaugeButton
    await findTextElement(client, "תורה");
    // await swipeUpOrDown(client, 'up', 300, 300);
    await findTextElement(client, "בריאת העולם, תחילתה של האנושות וסיפורי האבות והאמהות.");
    
    // Return back to english
    await toggleLanguageButton(client, false);
    await verifyExactTitle(client, "TANAKH");
    // await swipeUpOrDown(client, 'down', 300, 300);
    await findTextElement(client, "TORAH (The Five Books of Moses)");
    await findTextElement(client, "Genesis");
  });

  it('T005: Veryfying colored lines in between elements', async function () {
    // Check the colors (Indexes might change with UI update and type of phone)
    await checkViewGroupCenterPixelColor(client, 2, SEFARIA_COLORS.TANAKH_TEAL, true, THRESHOLD_RGB ); // Tanakh Teal
    await checkViewGroupCenterPixelColor(client, 4, SEFARIA_COLORS.MISHNAH_BLUE, true, THRESHOLD_RGB); // Mishna Blue
    await checkViewGroupCenterPixelColor(client, 6, SEFARIA_COLORS.TALMUD_GOLD, true, THRESHOLD_RGB); // Talmud Gold
    // Check Learning Schedules color
    await checkViewGroupCenterPixelColor(client, 9, SEFARIA_COLORS.CREAM_BACKGROUND, true, THRESHOLD_RGB); // White    
    
    // There is an issue currently in app behind the scene that prevents great tests
    // No resource id or description exists for certain UI elements, like the colored lines
    // Thus I can nly check their viewgroup by index, but index changes as I scroll, so flaky!

    //  await scrollTextIntoView(client, 'Midrash');
    // await client.pause(100);
    // // In Android, indexes change when scrolling (flaky-check scroll and indexes in appium tester)
    // await checkViewGroupCenterPixelColor(client, 7, '#5D956F', true); // Midrash Green
    // await checkViewGroupCenterPixelColor(client, 9, '#802F3E', true); // Halakhah Red
    // await checkViewGroupCenterPixelColor(client, 11, '#594176', true); // Kabbalah Purple
  });

  it('T006: Learning Schedules - See all button', async function () {
    // Click See All
    let learning_button = await findTextElement(client, "See All");
    await learning_button.click();

    // Verfiy Learning Schedule and current secular date is present (e.g Jul 9 2025)
    await findHeaderInFirstViewGroup(client, "Learning Schedules");
    const currentDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).replace(/, /g, ' ');
    await findTextElement(client, currentDate);

    // Check the current Jewish date (e.g Tammuz 13, 5785)
    const jewishDate = getHebrewDate();
    await findTextElement(client, jewishDate);
    
    // Verify the blur under the Learning Schedules is there
    await findTextContaining(client, "Since biblical times, the Torah has been divided into sections which are read each week on a set yearly calendar.")
    
    // Verify Headers above this weeks torah portion and Haftarah are present
    await findTextElement(client, "Weekly Torah Portion");
    await findTextElement(client, "Haftarah");

    // Minor scroll to get more more in view
    await swipeUpOrDown(client, SWIPE_CONFIG.DIRECTIONS.UP, SWIPE_CONFIG.SHORT_DISTANCE, SWIPE_CONFIG.SHORT_DISTANCE);

    // Fetch Current Parsha and Haftarah using Sefaria's API
    const parasha = await getCurrentParashatHashavua();
    const haftarah = await getCurrentHaftarah();

    // Check if Parashat Hashevua is correct
    if (parasha) {
      await findTextElement(client, parasha.displayValue.en);
    } else {
      throw new Error(apiResultMismatch("Parashat Hashavua", parasha!.displayValue.en));    
    }
    // Check if Haftarah for this week is correct
    if (haftarah) {
      await findTextElement(client, haftarah.displayValue.en);
    } else {
      throw new Error(apiResultMismatch("Haftarah", haftarah!.displayValue.en));
    }

    // Verify separator colors are there (probably do not have to use this, as other tests check this)
    // await checkViewGroupCenterPixelColor(client, 2, '#1f4d5d', true, THRESHOLD_RGB); // Tanakh Teal
    
    // Scroll to Daily Learning
    await swipeIntoView(client, "up", "Daily Learning",);
    await findTextElement(client, "Daily Learning");
    await findTextElement(client, "Daf Yomi");
    // Scroll to blurb about 929
    await swipeIntoView(client, "up", "A learning program in which participants study five of the Bible’s 929 chapters a week, completing it in about three and a half years.");
    await findTextElement(client, "929");

    // Scroll to Daily Rambam (3 Chapters)
    await swipeIntoView(client, "up", "Daily Rambam (3 Chapters)");
    await findTextElement(client, "Daily Rambam");
    
    // Scroll all the way to bottom and navigate to daf a week
    await swipeIntoView(client, "up", "Daf a Week", 5, 400);
    await findTextElement(client, "Weekly Learning");

    // Get the clickable element of current_weekly_daf
    let current_weekly_daf = await findTextElement(client, "Daf a Week");

    // Get the current Daf a Week fromn Sefaria API
    const daf_a_week = await getCurrentDafAWeek();
    await swipeIntoView(client, "up", daf_a_week!.displayValue.en);
    if (daf_a_week) {
      await findTextElement(client, daf_a_week.displayValue.en);
    } else {
      throw new Error(apiResultMismatch("Daf a Week", daf_a_week!.displayValue.en));
    }
    
    // Navigate to the Daf a Week section
    await current_weekly_daf.click();
    
    // Check if we are in Talmud
    await findTextElement(client, "The William Davidson Talmud")
    await findTextContaining(client, daf_a_week!.displayValue.en)

    // Extract the number after the space in daf_a_week.displayValue.en (e.g., "Bava Metzia 10" -> "10")
    const dafNumberMatch = daf_a_week!.displayValue.en.match(/\s(\d+)$/);
    const dafNumber = dafNumberMatch ? dafNumberMatch[1] : null;
    // Wait for current daf title to appear (e.g 37A)
    await verifyTitleContains(client, dafNumber!);
  });

  it('TC022: Dedication tab and results', async function () {
    // Scroll strongly all the way to button
    await swipeUpOrDown(client, SWIPE_CONFIG.DIRECTIONS.UP, SWIPE_CONFIG.LONG_DISTANCE, SWIPE_CONFIG.TEXT_SCROLL_DISTANCE);

    // Look for Dedication
    let dedication_button = await findTextContaining(client, "Dedicated in honor of")
    await dedication_button.click();

    // Check if Header of Dedication is present
    await findTextElement(client, "Sefaria App for iOS and Android")

    // Check if dedication message is there
    await findTextContaining(client, "Dedicated in honor of ");

    // Scroll to bottom of the dedication pop up
    await swipeUpOrDown(client, SWIPE_CONFIG.DIRECTIONS.UP, SWIPE_CONFIG.LONG_DISTANCE, SWIPE_CONFIG.TEXT_SCROLL_DISTANCE);
    
    // Check if the hebrew torah quote on bottom of dedication is present
    await findTextElement(client, "יגיע כפיך כי תאכל אשריך וטוב לך");
    await findTextElement(client, '(תהילים קכ"ח)');

    // Scroll back up to see the x button
    await swipeUpOrDown(client, SWIPE_CONFIG.DIRECTIONS.DOWN, SWIPE_CONFIG.LONG_DISTANCE, SWIPE_CONFIG.TEXT_SCROLL_DISTANCE);

    // Close the pop-up
    await closePopUp(client);

    // Verify we are back on the main page
    await findHeaderInFirstViewGroup(client, 'Browse the Library');

    // navigate to Account
    await clickNavBarItem(client, 'Account');
    await findHeaderInFirstViewGroup(client, 'Account');

    // Change language to Hebrew
    let hebrew_button = await findTextElement(client, "עברית");
    await hebrew_button.click();

    // Verify the language has changed
    dedication_button = await findTextContaining(client, "נתרם לכבודם");
    await dedication_button.click();

    // Verify Hebrew Header of Dedication is present
    await findTextElement(client, "האפליקציה של ספריא עבור אנדרואיד ו-iOS");

    // Check if dedication message is there in Hebrew
    await findTextContaining(client, "מוקדש לכבודם של");

    // Close the pop-up
    await closePopUp(client);

    // Change language back to English
    let english_button = await findTextElement(client, "English");
    await english_button.click();

    // Verify we are back in English
    await findHeaderInFirstViewGroup(client, 'Account');

  });

  it('TC021: Texts tab book category sub-page', async function () {
    // Click on Mishna
    let mishna = await findHeaderInFirstViewGroup(client, MISHNAH.en);
    await mishna.click();

    // check we are on the Mishna page
    await verifyExactTitle(client, "MISHNAH");

    // Check if part of the blurb is present
    await findTextContaining(client, MISHNAH.blurb);

    // Check if dividing line under the First SEDER ZERAIM is present
    await checkViewGroupCenterPixelColor(client, 2, '#ededec', true, THRESHOLD_RGB); // Light Gray

    // Check if the sefers below the sub categories (e.g. Seder Zeraim) has appropriate short blurb 
    await findElementByContentDesc(client, MISHNAH.content_desc.berakot);
    await findElementByContentDesc(client, MISHNAH.content_desc.peah);

    // Scroll down the screen to see all the Sederim are present
    for (const seder of MISHNAH.sedarim) {
      await swipeIntoView(client, 'up', seder, 5, 275);
      await findTextElement(client, seder);
    }
  });

  it('TC023: Topics tab comprehensive test', async function () {
    // Click on Topics
    await clickNavBarItem(client, 'Topics');
    // Check if we are on the Topics page
    await findHeaderInFirstViewGroup(client, 'Explore by Topic');

    let prayer_button = await findTextElement(client, "Prayer");
    await prayer_button.click();

    // Check if we are on the Prayer page
    await findTextElement(client, "Prayer");

    // Navigate to Aleinu
    let aleinu_button = await findTextElement(client, ALEINU.en);
    await aleinu_button.click();

    await verifyTopicTitle(client, ALEINU.en);
    
    // Check if the PRAYER subheader is present
    await verifyTopicCategory(client, "PRAYER");

    // Check if the Aleinu blurb is present
    await verifyTopicBlurb(client, ALEINU.blurb);

    // Assert we are sources page by seeing if SOURCES is underlines bold
    await findTextElement(client, "Sources");
    // Screenshot Sources element to check underline
    await checkElementByContentDescPixelColor(client, 'Sources', SEFARIA_COLORS.PALE_GRAY, "bottom", true, THRESHOLD_RGB); 
    // Check if Sheets is white
    await checkElementByContentDescPixelColor(client, 'Sheets', SEFARIA_COLORS.OFF_WHITE, "bottom", true, THRESHOLD_RGB); 
    
    // Move to sheets section and click it
    await clickSheets(client);
    // Check if it is now underlined and sources is white
    await checkElementByContentDescPixelColor(client, 'Sources', SEFARIA_COLORS.OFF_WHITE, "bottom", true, THRESHOLD_RGB); 
    await checkElementByContentDescPixelColor(client, 'Sheets', SEFARIA_COLORS.PALE_GRAY, "bottom", true, THRESHOLD_RGB); 
    
    // Move back to sources page
    await clickSources(client);
    
    // Click three dots and verify source connection appears
    await openSourceMenu(client);
    await findTextContaining(client, ALEINU.connection);
    await openSourceMenu(client); // Close the three dots menu

  });
  
  // Add more tests here...
});