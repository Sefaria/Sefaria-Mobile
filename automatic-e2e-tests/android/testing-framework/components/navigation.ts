import type { Browser } from 'webdriverio';
import { NAV_BAR_NOT_DISPLAYED, ELEMENT_NOT_VISIBLE, logError, CLOSE_POPUP_SUCCESS, CLOSE_POPUP_NOT_VISIBLE } from '../utils/constants';


/**
 * Waits for the navigation bar (navbar) to be displayed.
 * @param client WebdriverIO browser instance
 */
export async function waitForNavBar(client: Browser): Promise<void> {
  const navBarSelector = 'android=new UiSelector()'
    + '.className("android.view.ViewGroup")'
    + '.packageName("org.sefaria.sefaria")';
  const navBar = await client.$(navBarSelector);
  const isDisplayed = await navBar.waitForDisplayed({ timeout: 1000 }).catch(() => false);
  if (isDisplayed) {
    console.log('✅ Navigation bar is displayed!');
  } else {
    throw new Error(logError(NAV_BAR_NOT_DISPLAYED));
  }
}

/**
 * Clicks a navigation bar item by its content description (e.g., "Texts", "Topics", "Search", "Saved", "Account").
 * @param client WebdriverIO browser instance
 * @param contentDesc The content description of the nav bar item to click
 * @returns Promise<boolean> true if clicked, false otherwise
 */
export async function clickNavBarItem(client: Browser, contentDesc: string): Promise<boolean> {
  const itemSelector = `android=new UiSelector().className("android.view.ViewGroup").packageName("org.sefaria.sefaria").description("${contentDesc}")`;
  const item = await client.$(itemSelector);
  const isDisplayed = await item.waitForDisplayed({ timeout: 1000 }).catch(() => false);
  if (isDisplayed) {
    await item.click();
    console.log(`✅ Clicked nav bar item: ${contentDesc}`);
    return true;
  } else {
    throw new Error(logError(ELEMENT_NOT_VISIBLE + ` (nav bar item: ${contentDesc})`));
  }
}

/**
 * Clicks the close button on a pop-up if it is visible.
 * @param client WebdriverIO browser instance
 * @returns Promise<boolean> true if clicked, false otherwise
 */
export async function closePopUp(client: Browser): Promise<void> {
  const closeSelector = '//android.view.ViewGroup[@content-desc="Close"]/android.widget.ImageView';
  const closeBtn = await client.$(closeSelector);
  const isDisplayed = await closeBtn.waitForDisplayed({ timeout: 1000 }).catch(() => false);
  if (isDisplayed) {
    await closeBtn.click();
    console.log(CLOSE_POPUP_SUCCESS);
  } else {
    throw new Error(logError(CLOSE_POPUP_NOT_VISIBLE));
  }
}


