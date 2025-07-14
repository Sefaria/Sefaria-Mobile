import { remote } from 'webdriverio';
import { getOpts } from '../utils/getOpts';
import { waitForOfflinePopUp, clickNotNowIfPresent, clickOkIfPresent } from '../utils/offlinePopUp';
import { waitForNavBar, clickNavBarItem, closePopUp } from '../components/navigation';
import { typeIntoSearchBar, selectFromList} from '../components/search_page';
import { checkForTitle, checkForTextOnPage, checkForTitleContained } from '../components/reader_page'
import {  toggleLanguageButton } from '../components/display_settings'
import { apiResultMismatch } from '../utils/constants';
import { setBrowserStackStatus } from '../utils/browserstackUtils';
import { scrollTextIntoView, swipeUpOrDown } from '../utils/gesture'
import { checkViewGroupCenterPixelColor } from '../utils/ui_checker';
import { isTextOnPage, checkForHeader, isTextContainedOnPage } from '../utils/textUtils';
import { THRESHOLD_RGB } from '../utils/constants';
import { getHebrewDate } from '../utils/helper_functions'
import { getCurrentParashatHashavua, getCurrentHaftarah, getCurrentDafAWeek  } from '../utils/sefariaAPI'

import * as fs from 'fs';
import * as path from 'path';
// import { startScreenRecording, stopScreenRecording } from '../utils/screenRecording';

//  || Functions in order for logs and errors to be printed into test-run.log ||
//  || Allows github actions to have an easier log response ||

// Ensure the logs-test directory exists
const logsDir = path.resolve(__dirname, '../../logs-test');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create a unique log file name with current date and time
const now = new Date();
const dateStr = now.toISOString().replace(/:/g, '-').replace(/\..+/, '').replace('T', '_');
const logFilePath = path.join(logsDir, `test-run-${dateStr}.log`);
fs.writeFileSync(logFilePath, ''); // Clear contents or create file
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

const origLog = console.log;
const origError = console.error;
const origWarn = console.warn;

console.log = (...args: any[]) => {
  origLog(...args);
  logStream.write(args.map(String).join(' ') + '\n');
};
console.error = (...args: any[]) => {
  origError(...args);
  logStream.write('[ERROR] ' + args.map(String).join(' ') + '\n');
};
console.warn = (...args: any[]) => {
  origWarn(...args);
  logStream.write('[WARN] ' + args.map(String).join(' ') + '\n');
};

// Log uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err.stack || err);
});
process.on('unhandledRejection', (reason: any) => {
  console.error('[UNHANDLED REJECTION]', reason && reason.stack ? reason.stack : reason);
});

//  || Start of Tests ||

// let isFirstTest = true;
let noReset = false; // Set to true if you want same device session to continue with each test
const buildName = `Sefaria E2E ${new Date().toISOString().slice(0, 10)}`;

describe('Sefaria App Navigation', function () {
  this.timeout(100000); // Set timeout for Mocha tests
  let client: WebdriverIO.Browser;

  beforeEach(async function () {
    let testTitle = this.test?.title || 'Test';

    // Removes any prefix that starts with "before each" or similar variations
    // Ensures clean name in testing
    if (testTitle.includes('before each')) {
      testTitle = testTitle.replace(/.*before each.*hook for /, '');
    }

    console.log(`ℹ️ Running test: ${testTitle}`);
    client = await remote(getOpts(buildName, testTitle, noReset));

    // If it appears, close the download offline popup (Needs to be Here)
    if (await waitForOfflinePopUp(client, 15000)) {
      await clickNotNowIfPresent(client);
      await clickOkIfPresent(client);
    }
    // await startScreenRecording(client);
  });

  afterEach(async function () {
    // await stopScreenRecording(client, `./recordings/${this.currentTest?.title || 'test'}.mp4`);
    if (client) {
      if (process.env.RUN_ENV !== 'local') {
        const testStatus = this.currentTest?.state === 'passed' ? 'passed' : 'failed';
        const reason = this.currentTest?.err?.message || 'No error message';
        try {
          await setBrowserStackStatus(client, testStatus, reason);
        } catch (error) {
          console.error('❌ Failed to set BrowserStack session status:', error);
        }
      }
      await client.deleteSession();
    }
  });

  it('T001: Navigate to Topics and verify header appears', async function () {
    await waitForNavBar(client);
    await clickNavBarItem(client, 'Topics');
    await checkForHeader(client, 'Explore by Topic');
  });

  it('T002: Navigate to Sefat Emet, Genesis, Genesis and validate text', async function () {
    await waitForNavBar(client);
    await clickNavBarItem(client, 'Search');
    await checkForHeader(client, 'Search');
    
    // Remove last letter of what you want to search to cause the list to pop up
    // Otherwise, the list won't update or pop up
    await typeIntoSearchBar(client, "Sefat Emet, Genesis, Genesi");
    await selectFromList(client, "Sefat Emet, Genesis, Genesis");
    await checkForTitle(client, "Genesis, Bereshit 1");
  });

  it('T003: Navigate to Tanakh, scroll down and click Numbers', async function () {
    let tanakh = await checkForHeader(client, 'Tanakh');
    await tanakh.click();
    await checkForTitle(client, "TANAKH");
    await scrollTextIntoView(client, "Numbers");

    let numbers = await checkForHeader(client, 'Numbers')
    await numbers.click();
    await checkForTitle(client, "1");

    const BAMIDBAR_1_HEBREW = "וַיְדַבֵּ֨ר יְהֹוָ֧ה אֶל־מֹשֶׁ֛ה בְּמִדְבַּ֥ר סִינַ֖י בְּאֹ֣הֶל מוֹעֵ֑ד בְּאֶחָד֩ לַחֹ֨דֶשׁ הַשֵּׁנִ֜י בַּשָּׁנָ֣ה הַשֵּׁנִ֗ית לְצֵאתָ֛ם מֵאֶ֥רֶץ מִצְרַ֖יִם לֵאמֹֽר׃";
    const BAMIDBAR_1_ENGLISH = "On the first day of the second month, in the second year following the exodus from the land of Egypt, יהוה spoke to Moses in the wilderness of Sinai, in the Tent of Meeting, saying:"

    await checkForTextOnPage(client, BAMIDBAR_1_HEBREW);
    await checkForTextOnPage(client, BAMIDBAR_1_ENGLISH, true);
  });

  it('T004: Toggle Language to hebrew and see how it affects the page', async function () {
    await waitForNavBar(client);
    await toggleLanguageButton(client, true);
    
    // After changing language do a series of tests!
    await checkForHeader(client, 'Browse the Library');
    await isTextOnPage(client, "Learning Schedules");
    let tanakh = await checkForHeader(client, 'תנ"ך');
    await tanakh.click()

    // Verify English text is still present (does not change based on langaugeButton)
    await checkForTitle(client, "TANAKH");
    await isTextOnPage(client,"Weekly Torah Portion");

    // Verify the new hebrew text as a result of langaugeButton
    await isTextOnPage(client, "תורה");
    // await swipeUpOrDown(client, 'up', 300, 300);
    await isTextOnPage(client, "בריאת העולם, תחילתה של האנושות וסיפורי האבות והאמהות.");
    
    // Return back to english
    await toggleLanguageButton(client, false);
    await checkForTitle(client, "TANAKH");
    // await swipeUpOrDown(client, 'down', 300, 300);
    await isTextOnPage(client, "TORAH (The Five Books of Moses)");
    await isTextOnPage(client, "Genesis");
  });

  it('T005: Veryfying colored lines in between elements', async function () {
    await waitForNavBar(client);

    // Check the colors (Indexes might change with UI update and type of phone)
    await checkViewGroupCenterPixelColor(client, 2, '#1f4d5d', true, THRESHOLD_RGB ); // Tanakh Teal
    await checkViewGroupCenterPixelColor(client, 4, '#6998b4', true, THRESHOLD_RGB); // Mishna Blue
    await checkViewGroupCenterPixelColor(client, 6, '#c8b580', true, THRESHOLD_RGB); // Talmud Gold
    // Check Learning Schedules color
    await checkViewGroupCenterPixelColor(client, 9, '#FBFBFA', true, THRESHOLD_RGB); // White    
    
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
    await waitForNavBar(client);

    // Click See All
    let learning_button = await isTextOnPage(client, "See All");
    await learning_button.click();

    // Verfiy Learning Schedule and current secular date is present (e.g Jul 9 2025)
    await checkForHeader(client, "Learning Schedules");
    const currentDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).replace(/, /g, ' ');
    await isTextOnPage(client, currentDate);

    // Check the current Jewish date (e.g Tammuz 13, 5785)
    const jewishDate = getHebrewDate();
    await isTextOnPage(client, jewishDate);
    
    // Verify the blur under the Learning Schedules is there
    await isTextContainedOnPage(client, "Since biblical times, the Torah has been divided into sections which are read each week on a set yearly calendar.")
    
    // Verify Headers above this weeks torah portion and Haftarah are present
    await isTextOnPage(client, "Weekly Torah Portion");
    await isTextOnPage(client, "Haftarah");

    // Minor scroll to get more more in view
    await swipeUpOrDown(client, 'up', 175, 175);

    // Fetch Current Parsha and Haftarah using Sefaria's API
    const parasha = await getCurrentParashatHashavua();
    const haftarah = await getCurrentHaftarah();

    // Check if Parashat Hashevua is correct
    if (parasha) {
      await isTextOnPage(client, parasha.displayValue.en);
    } else {
      throw new Error(apiResultMismatch("Parashat Hashavua", parasha!.displayValue.en));    
    }
    // Check if Haftarah for this week is correct
    if (haftarah) {
      await isTextOnPage(client, haftarah.displayValue.en);
    } else {
      throw new Error(apiResultMismatch("Haftarah", haftarah!.displayValue.en));
    }

    // Verify seperator colors are there
    await checkViewGroupCenterPixelColor(client, 2, '#1f4d5d', true, THRESHOLD_RGB); // Tanakh Teal
    
    // Scroll to Daily Mishna
    await scrollTextIntoView(client, "Daily Learning");
    await isTextOnPage(client, "Daily Learning");
    await isTextOnPage(client, "Daf Yomi");
    await scrollTextIntoView(client, "A learning program in which participants study five of the Bible’s 929 chapters a week, completing it in about three and a half years.");
    await isTextOnPage(client, "929");

    // Scroll to Daily Rambam
    await scrollTextIntoView(client, "Daily Rambam (3 Chapters)");
    await isTextOnPage(client, "Daily Rambam");
    
    // Scroll all the way to bottom and navigate to daf a week
    await scrollTextIntoView(client, "Daf a Week");
    await isTextOnPage(client, "Weekly Learning");

    // Get the clickable element of current_weekly_daf
    let current_weekly_daf = await isTextOnPage(client, "Daf a Week");

    // Get the current Daf a Week fromn Sefaria API
    const daf_a_week = await getCurrentDafAWeek();
    await scrollTextIntoView(client, daf_a_week!.displayValue.en);
    if (daf_a_week) {
      await isTextOnPage(client, daf_a_week.displayValue.en);
    } else {
      throw new Error(apiResultMismatch("Daf a Week", daf_a_week!.displayValue.en));
    }
    
    // Navigate to the Daf a Week section
    await current_weekly_daf.click();
    
    // Check if we are in Talmud
    await isTextOnPage(client, "The William Davidson Talmud")
    await isTextContainedOnPage(client, daf_a_week!.displayValue.en)

    // Extract the number after the space in daf_a_week.displayValue.en (e.g., "Bava Metzia 10" -> "10")
    const dafNumberMatch = daf_a_week!.displayValue.en.match(/\s(\d+)$/);
    const dafNumber = dafNumberMatch ? dafNumberMatch[1] : null;
    // Wait for current daf title to appear (e.g 37A)
    await checkForTitleContained(client, dafNumber!);
  });

  it('TC022: Dedication tab and results', async function () {
    await waitForNavBar(client);

    // Scroll strongly all the way to button
    await swipeUpOrDown(client, 'up', 5000, 200);

    // Look for Dedication
    let dedication_button = await isTextContainedOnPage(client, "Dedicated in honor of")
    await dedication_button.click();

    // Check if Header of Dedication is present
    await isTextOnPage(client, "Sefaria App for iOS and Android")

    // Check if dedication message is there
    await isTextContainedOnPage(client, "Dedicated in honor of ");

    // Scroll to bottom of the dedication pop up
    await swipeUpOrDown(client, 'up', 5000, 200);
    
    // Check if the hebrew text is present
    await isTextOnPage(client, "יגיע כפיך כי תאכל אשריך וטוב לך");
    await isTextOnPage(client, '(תהילים קכ"ח)');

    // Scroll back up to see the x button
    await swipeUpOrDown(client, 'down', 5000, 200);

    // Close the pop-up
    await closePopUp(client);

    // Verify we are back on the main page
    await checkForHeader(client, 'Browse the Library');

    // navigate to Account
    await clickNavBarItem(client, 'Account');
    await checkForHeader(client, 'Account');

    // Change language to Hebrew
    let hebrew_button = await isTextOnPage(client, "עברית");
    await hebrew_button.click();

    // Verify the language has changed
    dedication_button = await isTextContainedOnPage(client, "נתרם לכבודם");
    await dedication_button.click();

    // Verify Hebrew Header of Dedication is present
    await isTextOnPage(client, "האפליקציה של ספריא עבור אנדרואיד ו-iOS");

    // Check if dedication message is there in Hebrew
    await isTextContainedOnPage(client, "מוקדש לכבודם של");

    // Close the pop-up
    await closePopUp(client);

    // Change language back to English
    let english_button = await isTextOnPage(client, "English");
    await english_button.click();

    // Verify we are back in English
    await checkForHeader(client, 'Account');

  });
  
  // Add more tests here...
});