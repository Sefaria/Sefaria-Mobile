/**
 * Renders the screens that carry the most interface text — once in English, once in
 * Hebrew — and asserts on the text that actually reaches the screen.
 *
 * `__tests__/i18n.test.js` is the *dictionary* check: it proves en.json and he.json agree
 * and that every id used in source exists. It never renders anything, so it cannot catch
 * a screen that looks up the wrong id, looks up an id built from a stale lookup table
 * (`strings.getString(undefined)` renders nothing at all), or forgets to substitute a
 * placeholder. This file is the *screen* check for those.
 *
 * How language switching works here: `strings.setLanguage(lang)` swaps the table that every
 * `strings.*` read goes through, which is what decides the text on screen. It does not
 * change `interfaceLanguage` in global state — that drives fonts and right-to-left layout,
 * which a renderer test cannot meaningfully assert on. Layout in Hebrew still needs a human
 * or a device screenshot.
 */
import React from 'react';
import { Text, TextInput, TouchableOpacity, Alert, Platform, Animated } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import strings from '../LocalizedStrings';
import en from '../i18n/en.json';
import he from '../i18n/he.json';
import TestContextWrapper from '../TestContextWrapper';
import { GlobalStateContext, DispatchContext, DEFAULT_STATE } from '../StateManager';
import { iconData } from '../IconData';
import SettingsPage from '../SettingsPage';
import { AuthPage } from '../AuthPage';
import { ForgotPasswordScreen } from '../ForgotPasswordScreen';
import { AccountNavigationMenu } from '../AccountNavigationMenu';
import ConnectionsPanel from '../ConnectionsPanel';
import TextList from '../TextList';
import LexiconBox from '../LexiconBox';
import { TopicPage, TopicCategory } from '../TopicPage';
import ReaderDisplayOptionsMenu from '../ReaderDisplayOptionsMenu';
import { VOCALIZATION } from '../VocalizationEnum';
import { FooterTabBar } from '../FooterTabBar';
import { SearchFilterPage } from '../search/SearchFilterPage';
import { LearningSchedulesPage } from '../learningSchedules/LearningSchedules';
import { LearningSchedulesBoxFactory } from '../learningSchedules/LearningSchedulesBox';
import { TextsPage } from '../TextsPage';
import { ShortDedication } from '../Dedication';
import { HistorySavedPage } from '../HistorySavedPage';
import SwipeableCategoryList from '../SwipeableCategoryList';
import VersionBlock, { VersionBlockWithPreview } from '../VersionBlock';
import ReaderTextTableOfContents from '../ReaderTextTableOfContents';
import { SearchResultPage } from '../search/SearchResultPage';
import AutocompleteList from '../search/AutocompleteList';
import {
  ButtonToggleSet, SefariaProgressBar, SaveButton, openActionSheet, SystemButton,
} from '../Misc';
import * as DownloadControl from '../DownloadControl';
import {
  promptLibraryUpdate, doubleDownload, PackagesState, Package, Tracker as DownloadTracker,
} from '../DownloadControl';
import { generalAppErrorAlert } from '../errors';
import { ssoCollisionMessage, ssoOnlyAccountMessage, ssoErrorWithCode } from '../authErrorMessages';
import { AUTH_ERROR_CODE, SSO_ERROR_CODE } from '../AuthConstants';
import ReaderApp from '../ReaderApp';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ActionSheet from 'react-native-action-sheet';

const TABLES = { en, he };
const NAMESPACES = Object.keys(en);
// A bare id that reached the screen, e.g. "common.ok" rendered instead of "OK".
const RAW_ID_RE = new RegExp(`^(?:${NAMESPACES.join('|')})\\.[a-z0-9_]+$`);
// A placeholder formatString never filled in, e.g. "Downloading ({percent}% of {size}mb)".
const UNFILLED_PLACEHOLDER_RE = /\{[a-z_][a-z0-9_]*\}/;

const value = (lang, id) => {
  const [ns, leaf] = id.split('.');
  return TABLES[lang][ns][leaf];
};

/**
 * Every id that some scenario in this file has actually asserted on.
 *
 * `expectScreenLocalizes` adds the ids it was handed; the Alert and dynamic-lookup blocks
 * add theirs explicitly. The `describe` at the bottom of the file then checks the tally
 * against the full string table, so "which strings are still untested" is a number the
 * suite reports rather than something someone has to go and count.
 *
 * This only works on a whole-file run. `jest -t 'Settings'` runs the coverage block with a
 * nearly empty tally and it will fail — that is expected; run the file without `-t`.
 */
const COVERED = new Set();
const markCovered = (ids) => { ids.forEach(id => COVERED.add(id)); };

/** Text nodes render strings, numbers, or nested arrays of them. Flatten to plain strings. */
const flattenChildren = (children, acc = []) => {
  if (Array.isArray(children)) children.forEach(c => flattenChildren(c, acc));
  else if (typeof children === 'string' || typeof children === 'number') acc.push(String(children));
  return acc;
};

/**
 * Every string the user can read on screen. That is the <Text> nodes, plus the greyed-out
 * `placeholder` of any search box — `strings.common.search` and `strings.search.search_texts`
 * are only ever shown that way, so a <Text>-only sweep would report them as missing.
 */
const renderedText = (inst) => [
  ...inst.root.findAllByType(Text).flatMap(node => flattenChildren(node.props.children)),
  ...inst.root.findAllByType(TextInput).map(node => node.props.placeholder).filter(Boolean),
];

/**
 * Renders `element` with the interface strings set to `lang` and returns every string the
 * user would see. act() is required: these screens set state while mounting, and without it
 * react-test-renderer unmounts the tree before assertions can read it.
 *
 * `interact` is for text that only appears after a tap — switching the History/Saved tab,
 * opening the "More" list. It receives the rendered tree and runs inside act(), so any state
 * it sets is flushed before the text is read.
 */
const renderIn = (lang, buildElement, interact) => {
  strings.setLanguage(lang);
  let inst;
  act(() => { inst = renderer.create(buildElement()); });
  if (interact) { act(() => { interact(inst); }); }
  const texts = renderedText(inst);
  act(() => { inst.unmount(); });
  return texts;
};

/**
 * The same thing for screens that fetch on mount — the saved list, the history list, a topic
 * page. Their first render shows a spinner, and the text under test only exists once the
 * queued promises have run, so this waits for them before reading the tree.
 */
const renderInSettled = async (lang, buildElement, interact) => {
  strings.setLanguage(lang);
  let inst;
  await act(async () => { inst = renderer.create(buildElement()); });
  await act(async () => { await flushPromises(); });
  if (interact) { await act(async () => { await interact(inst); }); }
  const texts = renderedText(inst);
  await act(async () => { inst.unmount(); });
  return texts;
};

// Strings are often concatenated with surrounding punctuation or spaces (" Log in."), and
// three call sites re-case a string after looking it up — SettingsPage.js (.toUpperCase()),
// SwipeableCategoryList.js and HistorySavedPage.js (.toLowerCase()) — so compare on a
// normalized form rather than demanding an exact node match. Hebrew has no letter case, so
// folding case costs nothing there.
// Bidi isolate and direction marks are inserted around mixed English/Hebrew runs. They are
// invisible to the reader, so they must not count when comparing text.
const BIDI_MARKS = /[\u200e\u200f\u2066-\u2069]/g;
const normalize = (s) => s.replace(BIDI_MARKS, '').trim().toLowerCase().replace(/[.:]+$/, '');

/**
 * Does `id`'s value for `lang` appear anywhere in `normalizedTexts`?
 *
 * A string with a `{placeholder}` never reaches the screen verbatim — the table holds
 * "{count} new book(s)" and the user sees "1 new book(s)" — so those are matched with the
 * slots turned into wildcards. Everything else is a straight comparison.
 */
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// A label is very often only part of a text node — "Genesis 1:1 • Currently Selected", or a
// tab caption with its result count appended — so the value is looked for inside the node
// rather than as the whole of it. The boundary check keeps "on" from matching inside
// "connections": the characters either side of a hit must not be letters or digits.
const TOKEN_CHAR = /[\p{L}\p{N}]/u;
const containsAsToken = (text, wanted) => {
  // Only guard an edge that is itself a letter or digit: a label like "(No content)" already
  // begins and ends with a bracket, and demanding a non-letter on the outside of that would
  // reject a legitimate hit that happens to follow a reference number.
  const guardStart = TOKEN_CHAR.test(wanted[0] || '');
  const guardEnd = TOKEN_CHAR.test(wanted[wanted.length - 1] || '');
  for (let i = text.indexOf(wanted); i !== -1; i = text.indexOf(wanted, i + 1)) {
    const before = text[i - 1] || '';
    const after = text[i + wanted.length] || '';
    if ((!guardStart || !TOKEN_CHAR.test(before)) && (!guardEnd || !TOKEN_CHAR.test(after))) {
      return true;
    }
  }
  return false;
};
const shows = (normalizedTexts, lang, id) => {
  const wanted = normalize(value(lang, id));
  // A Hebrew label sitting next to English text comes back split across several nodes — the
  // HTML renderer breaks the run at each direction change, so "(אין טקסט)" arrives as "(" and
  // "אין טקסט)". Searching the nodes joined back together catches those; the reader sees one
  // continuous line either way.
  const candidates = [...normalizedTexts, normalizedTexts.join('')];
  if (!UNFILLED_PLACEHOLDER_RE.test(wanted)) {
    return candidates.some(t => containsAsToken(t, wanted));
  }
  const pattern = wanted.split(/\{[a-z_][a-z0-9_]*\}/).map(escapeRegExp).join('[\\s\\S]+');
  return candidates.some(t => new RegExp(pattern).test(t));
};

/*
 * Working out which ids a screen displays.
 *
 * Do not guess, and do not read them off the JSX — a screen shows strings from every shared
 * widget it contains, and a hand-read list comes out short. Add the scenario with an empty
 * `expectedIds`, then temporarily make `expectScreenLocalizes` harvest instead of assert:
 *
 *   const idTable = Object.fromEntries(Object.entries(en).map(([ns, leaves]) =>
 *     [ns, Object.fromEntries(Object.keys(leaves).map(k => [k, `${ns}.${k}`]))]));
 *   strings.setContent({ en, he, zz: idTable });       // a language whose values are its ids
 *   console.log(renderIn('zz', buildElement, interact) // so every label prints its own id
 *     .flatMap(t => t.match(new RegExp(`(?:${NAMESPACES.join('|')})\\.[a-z0-9_]+`, 'gi')) || []));
 *   strings.setContent({ en, he });                    // `strings` is a process-wide singleton
 *   strings.setLanguage('en');
 *
 * Paste what it prints into `expectedIds`, lower-cased, and take the harvesting back out.
 * Match case-insensitively: SettingsPage.js upper-cases one label after looking it up, and
 * SwipeableCategoryList.js and HistorySavedPage.js lower-case another.
 *
 * The lists stay hand-written on purpose. One that names a string the screen does not show
 * fails loudly, so a wrong list cannot be quietly wrong.
 */

/**
 * The shared body of every screen case: render in both languages and check that each
 * expected string shows up in its own language and that no English leaks into Hebrew.
 *
 * @param buildElement  () => JSX for the screen under test
 * @param expectedIds   ids the screen must display in the state it is rendered in
 * @param interact      optional (inst) => void run inside act() after mount, for text that
 *                      only appears once something is tapped
 */
/** The assertions themselves, shared by the synchronous and settled variants. */
const assertLocalized = (byLang, expectedIds) => {
  for (const lang of ['en', 'he']) {
    const texts = byLang[lang];
    const normalized = texts.map(normalize);

    const notShown = expectedIds.filter(id => !shows(normalized, lang, id));
    expect({ lang, notShown }).toEqual({ lang, notShown: [] });

    const unfilled = texts.filter(t => UNFILLED_PLACEHOLDER_RE.test(t));
    expect({ lang, unfilled }).toEqual({ lang, unfilled: [] });

    const rawIds = texts.filter(t => RAW_ID_RE.test(t.trim()));
    expect({ lang, rawIds }).toEqual({ lang, rawIds: [] });
  }

  // Every string on these screens has a Hebrew translation distinct from its English one —
  // `i18n.test.js` has a test that proves no en/he pair is identical — so an English value
  // showing up in the Hebrew render means that label never went through the string table.
  const heNormalized = byLang.he.map(normalize);
  expect(expectedIds.filter(id => shows(heNormalized, 'en', id))).toEqual([]);
};

const expectScreenLocalizes = (buildElement, expectedIds, { interact } = {}) => {
  markCovered(expectedIds);
  assertLocalized({
    en: renderIn('en', buildElement, interact),
    he: renderIn('he', buildElement, interact),
  }, expectedIds);
};

/** `expectScreenLocalizes` for a screen that loads its content after mounting. */
const expectSettledScreenLocalizes = async (buildElement, expectedIds, { interact } = {}) => {
  markCovered(expectedIds);
  assertLocalized({
    en: await renderInSettled('en', buildElement, interact),
    he: await renderInSettled('he', buildElement, interact),
  }, expectedIds);
};

const noop = () => {};

// Lets already-queued promise callbacks run. Several of the alerts below are raised from
// inside a `.then()`, so the call that triggers them returns before the alert exists.
const flushPromises = () => new Promise(resolve => setImmediate(resolve));

const wrap = (child, childProps) => () => (
  <TestContextWrapper child={child} childProps={childProps} />
);

/**
 * Same as `wrap`, but with some of the global state overridden.
 *
 * `TestContextWrapper` always starts from DEFAULT_STATE — logged out, reading history on —
 * so screens that show different text in the other state (a logged-in account menu, the
 * "reading history is off" notice) can only be reached by supplying the context directly.
 */
const wrapWithState = (child, childProps, stateOverrides) => () => (
  <DispatchContext.Provider value={noop}>
    <GlobalStateContext.Provider value={{ ...DEFAULT_STATE, theme: {}, ...stateOverrides }}>
      {React.createElement(child, childProps)}
    </GlobalStateContext.Provider>
  </DispatchContext.Provider>
);

/**
 * Taps the tab or button whose label comes from `id`, for use as an `interact`.
 *
 * Matching is by rendered label rather than by component type because the headers are built
 * from a `titleKey` inside a shared widget, so there is no distinct component to search for.
 */
const pressTitled = (inst, id) => {
  const wanted = normalize(strings.getString(id));
  const node = inst.root.findAll(n =>
    typeof n.type !== 'string' && typeof n.props.onPress === 'function' &&
    renderedText({ root: n }).some(t => normalize(t) === wanted)
  ).pop();
  if (!node) { throw new Error(`no pressable showing ${id} ("${wanted}")`); }
  node.props.onPress();
};

/**
 * Offline data the nav screens read straight off the `Sefaria` singleton at render time.
 *
 * Without these, `Sefaria.toc` is null and the texts page throws, and the calendar hook
 * fires `Sefaria._loadCalendar()`, which reaches for `sources/calendar.json` on the device
 * and rejects — an unhandled rejection that takes the whole Jest worker down, not just the
 * one test. The shapes only need to be good enough to render: what these screens are being
 * checked for is their interface labels, not the library contents.
 */
beforeAll(() => {
  Sefaria.toc = [
    { category: 'Tanakh', heCategory: 'תנ״ך', enShortDesc: 'The Hebrew Bible.', heShortDesc: 'המקרא.' },
    { category: 'Mishnah', heCategory: 'משנה', enShortDesc: 'The Oral Torah.', heShortDesc: 'תורה שבעל פה.' },
    { category: 'Talmud', heCategory: 'תלמוד', enShortDesc: 'The Talmud.', heShortDesc: 'התלמוד.' },
    { category: 'Midrash', heCategory: 'מדרש', enShortDesc: 'Interpretive works.', heShortDesc: 'מדרשים.' },
    { category: 'Halakhah', heCategory: 'הלכה', enShortDesc: 'Jewish law.', heShortDesc: 'הלכה.' },
  ];
  // Truthy, so `useAsyncVariable` treats the calendar as already loaded and never calls
  // `_loadCalendar`. It holds no entry for today, so the schedule rows come out empty — the
  // section headings, which are the localized part, still render.
  Sefaria.calendar = {};
  Sefaria.galusOrIsrael = 'diaspora';
});

/**
 * Nothing in this file may reach the network.
 *
 * A screen that quietly fetches makes the suite slow, flaky, and dependent on sefaria.org
 * being up — and it is easy to introduce by accident, because a component fetches on mount
 * whether or not the test cares. Failing loudly here turns that into an obvious error
 * instead of a real request to production. A test that needs a particular response replaces
 * `global.fetch` itself and puts this back afterwards; see the API-layer alerts below.
 */
const REFUSE_NETWORK = () =>
  Promise.reject(new Error('a test tried to reach the network; stub the Sefaria.api method it calls'));

beforeAll(() => { global.fetch = jest.fn(REFUSE_NETWORK); });

afterAll(() => { strings.setLanguage('en'); });

describe('Settings screen', () => {
  test('renders its labels in both languages', () => {
    Sefaria.isGettinToBePurimTime = jest.fn(() => false);
    expectScreenLocalizes(
      wrap(SettingsPage, { close: noop, logout: noop, openUri: noop }),
      [
        'common.settings',
        'settings.text_language', 'languages.english', 'languages.hebrew', 'settings.bilingual',
        'settings.interface_language',
        'settings.email_frequency', 'settings.daily', 'settings.weekly', 'settings.never',
        'settings.reading_history', 'common.on_fem', 'common.off_fem',
        'settings.preferred_custom', 'settings.sephardi', 'settings.ashkenazi',
        'settings.download_network_setting', 'settings.wifi_only', 'settings.mobile_network',
        'settings.offline_access', 'settings.system', 'settings.terms_and_privacy',
        'settings.app_version',
      ]
    );
  });
});

describe('Auth screens', () => {
  const authProps = (authMode) => ({
    close: noop, authMode, showToast: noop, openLogin: noop, openRegister: noop, openUri: noop,
  });

  test('login renders its labels in both languages', () => {
    expectScreenLocalizes(wrap(AuthPage, authProps('login')), [
      'account.login',
      // The two form fields label themselves with a placeholder rather than a caption.
      'account.email', 'account.password',
      // Sign in with Google/Apple, either side of an "or" divider.
      'account.continue_with_google', 'account.continue_with_apple', 'common.or',
      'account.dont_have_an_account', 'account.create_an_account', 'account.forgot_password',
    ]);
  });

  test('register renders its labels in both languages', () => {
    expectScreenLocalizes(wrap(AuthPage, authProps('register')), [
      'account.signup',
      // Registering asks for a name as well, so it has two more fields than logging in.
      'account.first_name', 'account.last_name', 'account.email', 'account.password',
      'account.continue_with_google', 'account.continue_with_apple', 'common.or',
      'account.already_have_an_account', 'account.login',
      'account.by_clicking_sign_up', 'account.terms_of_use_and_privacy_policy',
    ]);
  });
});

describe('Forgot password screen', () => {
  const forgotProps = {
    theme: {}, themeStr: 'white', isHeb: false,
    close: noop, openLogin: noop,
    fireMethodChosen: noop, fireProcessStarted: noop, fireProcessEnded: noop,
    handleSSOTokenReceived: noop, handleSSOError: noop,
    ssoError: null, setSsoError: noop,
  };

  test('the form renders its labels in both languages', () => {
    expectScreenLocalizes(wrap(ForgotPasswordScreen, forgotProps), [
      'account.forgot_password_title', 'account.forgot_password_email_placeholder',
      'account.send_reset_link', 'account.back_to_login',
    ]);
  });

  // After a successful submit the same screen swaps to a confirmation, so the two views
  // never appear together.
  //
  // Driven by hand rather than through `expectSettledScreenLocalizes`: the submit handler
  // closes over the email from the last render and returns early on an empty one, so typing
  // has to be committed in its own act() before the button is pressed — and act() blocks
  // cannot be nested inside the helper's own.
  test('the confirmation renders its labels in both languages', async () => {
    // Not `account.back_to_login`: that link sits in the form branch, which the
    // confirmation replaces. The form test above covers it.
    const expectedIds = ['account.reset_link_sent_title', 'account.reset_link_sent_body'];
    markCovered(expectedIds);
    Sefaria.api.requestPasswordReset = jest.fn(async () => ({ success: true }));

    const byLang = {};
    for (const lang of ['en', 'he']) {
      strings.setLanguage(lang);
      let inst;
      await act(async () => {
        inst = renderer.create(wrap(ForgotPasswordScreen, forgotProps)());
      });
      await act(async () => {
        inst.root.findAllByType(TextInput)[0].props.onChangeText('someone@example.com');
      });
      await act(async () => {
        inst.root.findAllByType(SystemButton)
          .find(b => normalize(b.props.text) === normalize(strings.account.send_reset_link))
          .props.onPress();
      });
      byLang[lang] = renderedText(inst);
      await act(async () => { inst.unmount(); });
    }
    assertLocalized(byLang, expectedIds);
  });
});

describe('Account navigation menu', () => {
  // Logged-out menu: the component reads the logged-in flag from global state, and
  // TestContextWrapper always starts from DEFAULT_STATE, where it is false.
  test('renders its labels in both languages', () => {
    expectScreenLocalizes(
      wrap(AccountNavigationMenu, { menuOpen: 'account', openMenu: noop, openUri: noop, logout: noop }),
      [
        // `account.account`, not `nav.account`: both are "Account" in English but they have
        // different Hebrew ("חשבון משתמש" vs "חשבון"), so only a Hebrew render tells them apart.
        'account.account', 'account.signup', 'account.login', 'common.settings',
        'account.help', 'about.about_sefaria', 'about.donate', 'about.sefaria_501',
      ]
    );
  });
});

describe('Connections panel on Ezra 1:1', () => {
  const hebrewVersion = {
    versionTitle: 'Miqra according to the Masorah',
    versionTitleInHebrew: 'מקרא על פי המסורה',
    versionSource: 'https://he.wikisource.org',
    language: 'he',
    license: 'CC0',
    isPrimary: true,
    isSource: true,
    digitizedBySefaria: false,
  };
  const englishVersion = {
    versionTitle: 'The Contemporary Torah, JPS, 2006',
    versionTitleInHebrew: 'התורה בת זמננו',
    versionSource: 'https://www.sefaria.org',
    language: 'en',
    license: 'Public Domain',
    isPrimary: false,
    digitizedBySefaria: true,
  };

  const ezraProps = (connectionsMode) => ({
    connectionsMode,
    theme: {},
    themeStr: 'white',
    interfaceLanguage: 'english',
    textLanguage: 'bilingual',
    fontSize: 16,
    textTitle: 'Ezra',
    categories: ['Tanakh', 'Writings'],
    sectionRef: 'Ezra 1',
    segmentRef: 'Ezra 1:1',
    heSegmentRef: 'עזרא א׳:א׳',
    textListFlex: 0.6,
    loading: false,
    relatedHasError: false,
    textToc: {
      title: 'Ezra',
      heTitle: 'עזרא',
      compDate: -350,
      errorMargin: 0,
      enDesc: 'Ezra recounts the return from the Babylonian exile.',
      heDesc: 'ספר עזרא מתאר את שיבת ציון.',
    },
    // Four categories so the panel exceeds its three-button limit and renders "More".
    linkSummary: [
      { category: 'Commentary', count: 3, totalCount: 3, hasEn: true,
        refList: ['Ibn Ezra on Ezra 1:1'], heRefList: ['אבן עזרא על עזרא א׳:א׳'],
        books: [{ title: 'Ibn Ezra on Ezra', heTitle: 'אבן עזרא על עזרא',
                  collectiveTitle: 'Ibn Ezra', heCollectiveTitle: 'אבן עזרא',
                  count: 3, hasEn: true,
                  refList: ['Ibn Ezra on Ezra 1:1'], heRefList: ['אבן עזרא על עזרא א׳:א׳'] }] },
      { category: 'Midrash', count: 2, totalCount: 2, hasEn: true,
        refList: ['Seder Olam Rabbah 29'], heRefList: ['סדר עולם רבה כ״ט'], books: [] },
      { category: 'Talmud', count: 1, totalCount: 1, hasEn: true,
        refList: ['Megillah 11a'], heRefList: ['מגילה י״א א'], books: [] },
      { category: 'Halakhah', count: 1, totalCount: 1, hasEn: true,
        refList: ['Mishneh Torah, Foundations of the Torah 1'], heRefList: ['משנה תורה א'], books: [] },
    ],
    linkContents: [],
    versionContents: [],
    recentFilters: [],
    versionRecentFilters: [],
    currVersionObjects: { he: hebrewVersion, en: englishVersion },
    versions: [hebrewVersion, englishVersion],
    versionsApiError: false,
    translations: { versions: [hebrewVersion, englishVersion], apiError: false },
    relatedData: { topics: [], links: [], sheets: [], webpages: [], manuscripts: [], media: [], guides: [] },
    dictLookup: null,
    openRef: noop, setConnectionsMode: noop, openFilter: noop, closeCat: noop,
    updateLinkCat: noop, updateVersionCat: noop, loadLinkContent: noop, loadVersionContent: noop,
    onDragStart: noop, onDragMove: noop, onDragEnd: noop, openUri: noop, handleOpenURL: noop,
    onStartShouldSetResponderCapture: noop, shareCurrentSegment: noop, viewOnSite: noop,
    reportError: noop, loadRelated: noop, openTopic: noop,
  });

  test('main menu renders its labels in both languages', () => {
    expectScreenLocalizes(wrap(ConnectionsPanel, ezraProps(null)), [
      'connections.resources', 'connections.related_texts', 'connections.tools',
      'versions.about_this_text', 'versions.translations',
      'common.more', 'common.share', 'connections.report_error', 'connections.view_on_site',
    ]);
  });

  test('about-this-text renders its labels in both languages', () => {
    expectScreenLocalizes(wrap(ConnectionsPanel, ezraProps('about')), [
      'versions.about_this_text',
      'versions.current_hebrew_version', 'versions.current_english_version',
    ]);
  });

  // The translations panel's mode is spelled 'versions', not 'translations'.
  test('translations renders its labels in both languages', () => {
    expectScreenLocalizes(wrap(ConnectionsPanel, ezraProps('versions')), [
      'versions.translations', 'versions.translations_description', 'common.learn_more',
      // Language headers come from `languages.${isoCode}` built at runtime, so this is the
      // one place a dynamically-constructed id is checked against a real render.
      'languages.hebrew', 'languages.english',
    ]);
  });

    test('the "less" toggle appears once the related list is expanded, in both languages', () => {
      expectScreenLocalizes(
        wrap(ConnectionsPanel, ezraProps(null)),
        ['common.less'],
        // Tapping "More" swaps the button's own label to "Less".
        { interact: (inst) => pressTitled(inst, 'common.more') }
      );
    });

    test('a failed related-content load offers a retry, in both languages', () => {
      expectScreenLocalizes(
        wrap(ConnectionsPanel, { ...ezraProps(null), relatedHasError: true }),
        ['connections.resources_failed_to_load']
      );
    });

    test('about-this-text lists other primary versions in both languages', () => {
      // A second Hebrew version marked primary is what produces the extra section.
      const otherPrimary = {
        versionTitle: 'Tanach with Ta’amei Hamikra',
        versionTitleInHebrew: 'תנ״ך עם טעמי המקרא',
        versionSource: 'https://he.wikisource.org',
        language: 'he', license: 'CC0', isPrimary: true,
      };
      const props = ezraProps('about');
      expectScreenLocalizes(
        wrap(ConnectionsPanel, { ...props, versions: [...props.versions, otherPrimary] }),
        ['versions.other_primary_versions']
      );
    });

  test('a selected category renders its labels in both languages', () => {
    // No expected ids: with a category open the panel is almost all data (book names and
    // counts). This case exists to prove that state renders at all in Hebrew without
    // leaking a raw id or an unfilled placeholder.
    expectScreenLocalizes(wrap(ConnectionsPanel, ezraProps('Commentary')), []);
  });
});

describe('Reader display options menu', () => {
  // Every toggle row is behind a `condition` prop, so the fixture turns them all on: a
  // continuous-capable, aliyot-capable, bilingual text is the only state that shows the
  // whole menu at once.
  const displayProps = (vowelToggleAvailable) => ({
    theme: {}, themeStr: 'white',
    interfaceLanguage: 'english', textLanguage: 'bilingual',
    textFlow: 'segmented', biLayout: 'stacked',
    canBeContinuous: true, canHaveAliyot: true, showAliyot: false,
    vowelToggleAvailable, vocalization: VOCALIZATION.NIKKUD,
    setTextFlow: noop, setTextLanguage: noop, setAliyot: noop, setBiLayout: noop,
    incrementFont: noop, setTheme: noop, setVocalization: noop,
  });

  test('renders its labels in both languages', () => {
    expectScreenLocalizes(
      wrap(ReaderDisplayOptionsMenu, displayProps(VOCALIZATION.TAAMIM_AND_NIKKUD)),
      [
        'reader.language', 'reader.layout', 'reader.bilingual_layout', 'reader.color',
        'reader.aliyot', 'common.on', 'common.off', 'reader.font_size', 'reader.vocalization',
      ]
    );
  });

  // The last row is labelled `reader.vocalization` for a text that has cantillation marks and
  // `reader.vowels` for one that only has vowels, so the two labels never appear together.
  test('a text without cantillation marks labels the row "vowels"', () => {
    expectScreenLocalizes(wrap(ReaderDisplayOptionsMenu, displayProps(VOCALIZATION.NIKKUD)),
      ['reader.vowels']);
  });
});

describe('Footer tab bar', () => {
  test('renders every tab label in both languages', () => {
    expectScreenLocalizes(wrap(FooterTabBar, { selectedTabName: 'Texts', setTab: noop }), [
      'nav.texts', 'common.topics', 'common.search', 'history.saved', 'nav.account',
    ]);
  });
});

describe('Search filter page', () => {
  const searchState = {
    type: 'text',
    filtersValid: false,
    availableFilters: [],
    appliedFilters: [],
    sortType: 'relevance',
    field: 'naive_lemmatizer',
    fieldExact: 'exact',
    fieldBroad: 'naive_lemmatizer',
  };

  // filtersValid: false is the state right after a search is fired, and it is the only one
  // that shows `search.loading_filters`.
  test('renders its labels in both languages', () => {
    expectScreenLocalizes(wrap(SearchFilterPage, {
      searchState, query: 'moses',
      toggleFilter: noop, clearAllFilters: noop, openSubMenu: noop, search: noop,
      setSearchOptions: noop, onBack: noop,
    }), [
      'common.reset', 'search.sort_by', 'search.relevance', 'search.chronological',
      'search.text', 'search.search_texts', 'search.options', 'search.exact_matches_only',
      'search.show_results', 'search.loading_filters',
    ]);
  });
});

describe('Learning schedules box', () => {
  // The box that sits inside a category page. Which schedule it shows is chosen by category,
  // and the two live mappings are the only places these two labels appear.
  test('Tanakh shows the weekly Torah portion, in both languages', () => {
    expectScreenLocalizes(
      wrap(LearningSchedulesBoxFactory, { categories: ['Tanakh'], openRef: noop }),
      ['learning_schedules.weekly_torah_portion']);
  });

  test('Talmud Bavli shows Daf Yomi, in both languages', () => {
    expectScreenLocalizes(
      wrap(LearningSchedulesBoxFactory, { categories: ['Talmud', 'Bavli'], openRef: noop }),
      ['learning_schedules.daf_yomi']);
  });
});

describe('Learning schedules page', () => {
  test('renders its labels in both languages', () => {
    expectScreenLocalizes(
      wrap(LearningSchedulesPage, { openRef: noop, openUri: noop, onBack: noop }),
      [
        'learning_schedules.learning_schedules', 'learning_schedules.weekly_torah_portion',
        'learning_schedules.daily_learning', 'learning_schedules.weekly_learning',
      ]
    );
  });
});

describe('Texts page', () => {
  test('renders its labels in both languages', () => {
    expectScreenLocalizes(wrap(TextsPage, {
      categories: [], setCategories: noop, openRef: noop,
      openLearningSchedules: noop, onBack: noop, openDedication: noop,
    }), [
      'nav.browse_the_library', 'learning_schedules.learning_schedules', 'common.see_all',
      'about.dedicated_ios',
    ]);
  });
});

describe('Dedication footer', () => {
  // The full Dedication page is hand-written English and Hebrew prose, not string ids. The
  // one localized part is this footer line, and it is per-platform: `about.dedicated_ios` on
  // iOS, `about.dedicated_android` on Android. Jest reports Platform.OS as 'ios', so only
  // the iOS line can be rendered; the Android one is asserted on directly below.
  test('renders its label in both languages', () => {
    expectScreenLocalizes(wrap(ShortDedication, { openDedication: noop }),
      ['about.dedicated_ios']);
  });
});

describe('Account navigation menu when logged in', () => {
  test('renders its labels in both languages', () => {
    expectScreenLocalizes(
      wrapWithState(AccountNavigationMenu,
        { menuOpen: 'account', openMenu: noop, openUri: noop, logout: noop },
        { isLoggedIn: true }),
      [
        'account.account', 'common.settings', 'account.help', 'about.about_sefaria',
        // The one button the logged-out menu does not have.
        'account.logout',
        'about.donate', 'about.dedicated_ios', 'about.sefaria_501',
      ]
    );
  });
});

describe('History and Saved page', () => {
  const historyProps = { openRef: noop, openMenu: noop, hasInternet: true };

  test('the saved tab renders its labels in both languages', () => {
    expectScreenLocalizes(wrap(HistorySavedPage, historyProps), [
      'history.saved', 'history.history', 'history.want_to_sync', 'account.login',
    ]);
  });

  // Reading history switched off is what shows `history.reading_history_is_currently_disabled`,
  // and it only shows on the history tab, so the tab has to be tapped.
  test('the history tab with reading history off renders its labels in both languages', () => {
    expectScreenLocalizes(
      wrapWithState(HistorySavedPage, historyProps, { readingHistory: false }),
      [
        'history.saved', 'history.history', 'history.want_to_sync', 'account.login',
        'history.reading_history_is_currently_disabled', 'common.settings',
      ],
      { interact: (inst) => pressTitled(inst, 'history.history') }
    );
  });
});

describe('Swipeable history list', () => {
  const swipeProps = {
    close: noop, theme: {}, themeStr: 'white', openRef: noop,
    textLanguage: 'english', interfaceLanguage: 'english',
    onRemove: noop, openSettings: noop, openLogin: noop,
    title: 'History', menuOpen: 'history',
    icon: iconData.get('clock', 'white'),
    isLoggedIn: false, hasDismissedSyncModal: false, readingHistory: false,
    dispatch: noop,
    loadData: () => Promise.resolve([
      { ref: 'Genesis 1:1', he_ref: 'בראשית א:א', versions: {}, book: 'Genesis' },
    ]),
  };

  test('renders its labels in both languages', () => {
    Sefaria.primaryCategoryForTitle = jest.fn(() => 'Tanakh');
    expectScreenLocalizes(
      wrapWithState(SwipeableCategoryList, swipeProps, { readingHistory: false }), [
        'history.want_to_sync', 'account.login',
        'history.reading_history_is_currently_disabled', 'common.settings',
      ]);
  });
});

/**
 * Alerts are native pop-ups, not part of the rendered tree, so nothing above can see them.
 * They are checked by spying on `Alert.alert` and reading back the title, body and button
 * labels it was handed.
 *
 * `expectAlertLocalizes` runs the trigger once per language and asserts on the whole set of
 * alerts it produced, so a follow-up alert opened by a button (the "Not now" path of the
 * library-update prompt, say) is covered in the same pass.
 */
const alertTexts = () => Alert.alert.mock.calls.flatMap(([title, body, buttons]) =>
  [title, body, ...(buttons || []).map(b => b.text)].filter(t => typeof t === 'string'));

const expectAlertLocalizes = async (trigger, expectedIds) => {
  markCovered(expectedIds);
  for (const lang of ['en', 'he']) {
    strings.setLanguage(lang);
    Alert.alert.mockClear();
    await trigger();

    const texts = alertTexts();
    const normalized = texts.map(normalize);
    const notShown = expectedIds.filter(id => !shows(normalized, lang, id));
    expect({ lang, notShown }).toEqual({ lang, notShown: [] });

    // The same three checks the screens get: nothing unsubstituted, no bare id, no English
    // leaking into the Hebrew alert.
    expect({ lang, unfilled: texts.filter(t => UNFILLED_PLACEHOLDER_RE.test(t)) })
      .toEqual({ lang, unfilled: [] });
    expect({ lang, rawIds: texts.filter(t => RAW_ID_RE.test(t.trim())) })
      .toEqual({ lang, rawIds: [] });
    if (lang === 'he') {
      expect(expectedIds.filter(id => shows(normalized, 'en', id))).toEqual([]);
    }
  }
};

/** Presses the button labelled `id` on the alert that is currently open. */
const pressAlertButton = (id) => {
  const wanted = normalize(strings.getString(id));
  for (const [, , buttons] of Alert.alert.mock.calls) {
    const button = (buttons || []).find(b => normalize(b.text || '') === wanted);
    if (button && button.onPress) { button.onPress(); return; }
  }
  throw new Error(`no alert button labelled ${id} ("${wanted}")`);
};

describe('Alerts', () => {
  beforeEach(() => { jest.spyOn(Alert, 'alert').mockImplementation(noop); });
  afterEach(() => { Alert.alert.mockRestore(); });

  describe('from the API layer', () => {
    // `Sefaria.api._request` raises these itself rather than returning an error, so the two
    // failure shapes are produced by stubbing fetch. Both alerts reject the request promise,
    // hence the catch.
    // _request(ref, apiType, urlify, extra_args, failSilently). failSilently must stay false:
    // that is the flag that decides between showing the alert and rejecting quietly.
    const request = async (fetchImpl) => {
      global.fetch = jest.fn(fetchImpl);
      try {
        // The alert's own buttons are what settle this promise, so awaiting it here would
        // hang. Fire it, let the fetch chain run to the Alert.alert call, then move on.
        Sefaria.api._request('Genesis 1', 'text', true, {}, false).catch(noop);
        await flushPromises();
      } finally {
        global.fetch = jest.fn(REFUSE_NETWORK);
      }
    };

    test('a text the server does not have is reported in both languages', async () => {
      await expectAlertLocalizes(
        () => request(async () => ({ status: 200, json: async () => ({ error: 'not found' }) })),
        ['errors.text_unavailable', 'errors.text_unavailable_from_web_message', 'common.ok']
      );
    });

    test('a dead connection is reported in both languages', async () => {
      await expectAlertLocalizes(
        () => request(async () => { throw new Error('network down'); }),
        ['errors.no_internet', 'errors.no_internet_message', 'common.cancel', 'common.try_again']
      );
    });
  });

  describe('from the reader', () => {
    // These are instance methods, so the app has to be mounted to reach them — the same way
    // `__tests__/ReaderApp.test.js` gets at `getSettingsObject`.
    const readerAppInstance = () => {
      let inst;
      act(() => { inst = renderer.create(
          <TestContextWrapper passContextToChildren child={ReaderApp}
            childProps={{ showErrorBoundary: noop }} />); });
      return inst.root.findByType(ReaderApp).instance;
    };

    test('an unavailable text offers the website, in both languages', async () => {
      const app = readerAppInstance();
      await expectAlertLocalizes(
        () => app.textUnavailableAlert('Genesis 1:1'),
        ['errors.text_unavailable', 'errors.prompt_open_on_web_message', 'common.cancel',
         'common.open']
      );
    });

    test('the first-run download prompt renders in both languages', async () => {
      const app = readerAppInstance();
      await expectAlertLocalizes(
        async () => {
          await AsyncStorage.removeItem('libraryDownloadPrompted');
          // The method reads AsyncStorage before alerting and does not hand back its
          // promise, so wait for the queued work rather than for the call.
          app.promptLibraryDownload();
          await flushPromises();
          // "Not now" opens the second alert explaining how to download later.
          pressAlertButton('common.not_now');
        },
        ['common.welcome', 'download.download_library_recommended_message',
         'download.open_settings', 'common.not_now',
         'download.using_online_library', 'download.how_to_download_library_message',
         'common.ok']
      );
    });
  });

  describe('from the download controller', () => {
    test('the library-update prompt renders both of its alerts in both languages', async () => {
      await expectAlertLocalizes(
        async () => {
          promptLibraryUpdate(['a', 'b', 'c'], ['a'], 'wifiOnly');
          // "Not now" opens the follow-up telling the user how to update later.
          pressAlertButton('common.not_now');
        },
        ['download.update_library', 'download.download', 'common.not_now',
         'download.new_books_available', 'download.updates_available_message',
         'download.update_later', 'download.how_to_update_library_message', 'common.ok']
      );
    });

    test('the double-download warning renders in both languages', async () => {
      await expectAlertLocalizes(doubleDownload, ['download.double_download', 'common.ok']);
    });
  });

  describe('from the settings page', () => {
    // Switching reading history off warns before deleting what is already stored. The toggle
    // is reached the way `__tests__/SettingsPage.test.js` reaches it: by component and
    // `stateKey`, since the buttons carry no text of their own.
    const pressReadingHistoryOff = () => {
      Sefaria.isGettinToBePurimTime = jest.fn(() => false);
      Sefaria.util.epoch_time = jest.fn(() => 1);
      let inst;
      act(() => {
        inst = renderer.create(
          <TestContextWrapper child={SettingsPage}
            childProps={{ close: noop, logout: noop, openUri: noop }} />);
      });
      // `stateKey` is set on the section <View> purely so tests can find each toggle;
      // see the comment above `toggleButtons` in SettingsPage.js.
      const section = inst.root.findAll(n => n.props.stateKey === 'readingHistory')[0];
      const toggle = section.findByType(ButtonToggleSet);
      act(() => { toggle.props.options.find(o => o.name === 'offFem').onPress(); });
    };

    test('the reading-history warning renders in both languages', async () => {
      await expectAlertLocalizes(pressReadingHistoryOff,
        ['common.delete', 'settings.turning_this_feature_off', 'common.cancel']);
    });
  });
});

/**
 * The sign-in failure messages.
 *
 * These never reach a screen through a render this file can drive — they come back from
 * `authErrorMessages.js` as strings, which the banner then displays — so they are checked
 * the same way the dynamic namespaces below are: call the mapping function once per
 * language and compare against the table.
 *
 * Each is reached by a distinct backend answer, and picking the wrong branch shows the user
 * the wrong provider, so the branches are exercised individually rather than in bulk.
 */
describe('Sign-in error messages', () => {
  const CASES = [
    ['a Google-only account',     () => ssoOnlyAccountMessage({ code: AUTH_ERROR_CODE.SSO_ONLY_ACCOUNT, providers: ['google'] }),           'errors.sso_email_exists_google'],
    ['an Apple-only account',     () => ssoOnlyAccountMessage({ code: AUTH_ERROR_CODE.SSO_ONLY_ACCOUNT, providers: ['apple'] }),            'errors.sso_email_exists_apple'],
    ['an account with both',      () => ssoOnlyAccountMessage({ code: AUTH_ERROR_CODE.SSO_ONLY_ACCOUNT, providers: ['google', 'apple'] }),  'errors.sso_email_exists_apple_and_google'],
    ['an unrecognised answer',    () => ssoOnlyAccountMessage({ code: AUTH_ERROR_CODE.SSO_ONLY_ACCOUNT, providers: [] }),                   'errors.sso_generic'],
    ['a dropped connection',      () => ssoErrorWithCode(SSO_ERROR_CODE.NETWORK_ERROR),                                                     'errors.auth_network'],
    ['any other failure',         () => ssoErrorWithCode('some_other_code'),                                                                'errors.sso_generic'],
    // This one is matched from the backend's English sentence, so it also proves the
    // dotted-id lookup in SSO_COLLISION_MESSAGE_KEYS still resolves.
    ['a duplicate-email reply',   () => ssoCollisionMessage('An account with this email address already exists.'), 'errors.sso_email_exists_generic'],
  ];

  test.each(CASES)('%s is reported in both languages', (_label, produce, id) => {
    markCovered([id]);
    for (const lang of ['en', 'he']) {
      strings.setLanguage(lang);
      expect({ lang, message: produce() }).toEqual({ lang, message: value(lang, id) });
    }
  });
});

/**
 * Two namespaces are never written out as literal ids. `TranslationsBox.js` looks up
 * `languages.${isoCode}` and `VersionBlock.js` looks up `'licenses.' + license.toLowerCase()`,
 * so the id only exists at run time and no screen displays more than a couple of them.
 *
 * Building a screen per language would prove nothing extra — the Connections panel's
 * translations case above already proves the dynamic path reaches the screen. What is left to
 * check is that every key in these namespaces resolves, which is what this does.
 */
describe('Ids assembled at run time', () => {
  const dynamicNamespace = (ns) => {
    const ids = Object.keys(en[ns]).map(leaf => `${ns}.${leaf}`);
    markCovered(ids);
    for (const lang of ['en', 'he']) {
      strings.setLanguage(lang);
      const wrong = ids.filter(id => strings.getString(id) !== value(lang, id));
      expect({ lang, wrong }).toEqual({ lang, wrong: [] });
    }
  };

  test('every language name resolves in both languages', () => { dynamicNamespace('languages'); });
  test('every licence name resolves in both languages', () => { dynamicNamespace('licenses'); });
});

/**
 * Placeholder substitution.
 *
 * `formatString` fills `{name}` slots by name. If a translator renames a slot, or a caller
 * passes the wrong key, the literal "{count}" ships to the user — which the screen checks
 * above catch only for strings that happen to be on a screen under test. These ten are every
 * string in the table that has a placeholder at all, checked directly in both languages.
 */
describe('Strings with placeholders', () => {
  const SUBSTITUTIONS = {
    'common.open_item': { item: 'Genesis' },
    'download.are_included_in': { package: 'Tanakh' },
    'download.downloading_progress': { percent: 42, size: 130 },
    'download.library_up_to_date_message': { platform: 'ios' },
    'download.new_books_available': { count: 3 },
    'download.updates_available_message': { count: 7 },
    'search.no_results_containing': { query: 'moses' },
    'topics.this_source_is_connected_to': { title: 'Passover', sources: '4 sources' },
    'topics.this_topic_is_connected_to': { title: 'Passover', sources: '4 sources' },
    'versions.merged_from': { sources: 'two editions' },
  };

  test('the list below is every string in the table that has a placeholder', () => {
    // So a new placeholder string added in Weblate cannot go unchecked.
    const withPlaceholders = NAMESPACES.flatMap(ns => Object.keys(en[ns])
      .map(leaf => `${ns}.${leaf}`)
      .filter(id => UNFILLED_PLACEHOLDER_RE.test(value('en', id))));
    expect(withPlaceholders.sort()).toEqual(Object.keys(SUBSTITUTIONS).sort());
  });

  test.each(Object.entries(SUBSTITUTIONS))('%s substitutes its values', (id, values) => {
    markCovered([id]);
    for (const lang of ['en', 'he']) {
      strings.setLanguage(lang);
      const result = strings.formatString(strings.getString(id), values);
      // formatString returns an array when it splits around a slot; join it the way React
      // would before looking at the text.
      const text = Array.isArray(result) ? result.join('') : String(result);

      expect({ lang, id, text }).toEqual({ lang, id, text: expect.not.stringMatching(UNFILLED_PLACEHOLDER_RE) });
      for (const v of Object.values(values)) {
        expect({ lang, id, missing: text.includes(String(v)) ? null : v })
          .toEqual({ lang, id, missing: null });
      }
    }
  });
});

describe('Version block', () => {
  // One version carrying every optional field, so each of the metadata rows renders. A real
  // version object has at most a couple of these at a time.
  const richVersion = {
    versionTitle: 'The Contemporary Torah, JPS, 2006',
    versionTitleInHebrew: 'התורה בת זמננו',
    shortVersionTitle: 'JPS 2006',
    // Deliberately not a sefaria.org URL: the host is printed next to the "Digitization:
    // Sefaria" row, and the English-leak check works on substrings, so a fixture that
    // contains an English label's text would look like a leak.
    versionSource: 'https://www.jps.org',
    language: 'en',
    license: 'Public Domain',
    digitizedBySefaria: true,
    purchaseInformationURL: 'https://www.sefaria.org/buy',
    text: 'In the beginning.',
  };

  test('renders every metadata row in both languages', () => {
    expectScreenLocalizes(wrap(VersionBlock, {
      version: richVersion, openUri: noop, openFilter: noop, segmentRef: 'Genesis 1:1',
    }), [
      'versions.source', 'versions.digitization', 'common.sefaria', 'versions.license',
      // "Public Domain" is the one licence with a translation; the CC ones render as-is.
      'licenses.public_domain', 'versions.buy_in_print',
    ]);
  });

  // A merged version has no single title, so it is labelled with the sources it came from.
  test('a merged version names its sources in both languages', () => {
    expectScreenLocalizes(wrap(VersionBlock, {
      version: { ...richVersion, merged: true, sources: ['JPS 1917', 'JPS 2006'] },
      openUri: noop, openFilter: noop, segmentRef: 'Genesis 1:1',
    }), ['versions.merged_from']);
  });

  // The preview variant is what the translations list uses. Its metadata is collapsed until
  // the row is tapped.
  test('the preview variant renders its labels in both languages', () => {
    expectScreenLocalizes(
      wrap(VersionBlockWithPreview, {
        version: richVersion, openUri: noop, openFilter: noop, segmentRef: 'Genesis 1:1',
        isCurrent: false, openRef: noop, heVersionTitle: 'התורה בת זמננו',
      }),
      ['common.open', 'versions.source', 'versions.digitization', 'versions.license'],
      { interact: (inst) => inst.root.findAllByType(TouchableOpacity)[1].props.onPress() }
    );
  });

  test('the currently-selected version says so, in both languages', () => {
    expectScreenLocalizes(wrap(VersionBlockWithPreview, {
      version: richVersion, openUri: noop, openFilter: noop, segmentRef: 'Genesis 1:1',
      isCurrent: true, openRef: noop, heVersionTitle: 'התורה בת זמננו',
    }), ['versions.currently_selected']);
  });
});

describe('Table of contents', () => {
  test('renders its heading in both languages', () => {
    Sefaria.index = jest.fn(() => ({ heTitle: 'בראשית', categories: ['Tanakh', 'Torah'] }));
    Sefaria.primaryCategoryForTitle = jest.fn(() => 'Tanakh');
    Sefaria.hebrewCategory = jest.fn(c => c);
    expectScreenLocalizes(wrap(ReaderTextTableOfContents, {
      title: 'Genesis', textToc: null, currentRef: 'Genesis 1:1', currentHeRef: 'בראשית א׳:א׳',
      openRef: noop, close: noop, openUri: noop, textUnavailableAlert: noop,
    }), ['reader.table_of_contents']);
  });
});

describe('Search results page', () => {
  const searchState = {
    type: 'text', filtersValid: false, availableFilters: [], appliedFilters: [],
    sortType: 'relevance', field: 'naive_lemmatizer', fieldExact: 'exact',
    fieldBroad: 'naive_lemmatizer', isLoading: false, numResults: 0, moreToLoad: false,
  };

  test('renders its labels in both languages', () => {
    expectScreenLocalizes(wrap(SearchResultPage, {
      query: 'moses', searchState, searchType: 'text',
      textSearchState: searchState, sheetSearchState: searchState,
      search: noop, setIsNewSearch: noop, onChangeSearchQuery: noop, openAutocomplete: noop,
      openSubMenu: noop, setSearchTypeState: noop, openRef: noop, setLoadTail: noop,
      setInitSearchScrollPos: noop, isNewSearch: false,
    }), ['common.search', 'common.sources', 'search.filter']);
  });
});

describe('Search autocomplete list', () => {
  // With no completions yet, the list shows the recent-searches heading instead.
  test('renders its labels in both languages', () => {
    expectScreenLocalizes(wrap(AutocompleteList, {
      theme: {}, themeStr: 'white', interfaceLanguage: 'english',
      query: '', search: noop, openRef: noop, openTextTocDirectly: noop,
      setCategories: noop, openUri: noop, onDismiss: noop,
    }), ['search.recent_searches']);
  });
});

describe('Settings screen around Purim', () => {
  // One extra toggle appears in the run-up to Purim, and it is the only place this label
  // is ever shown.
  test('renders the grogger toggle in both languages', () => {
    Sefaria.isGettinToBePurimTime = jest.fn(() => true);
    expectScreenLocalizes(
      wrap(SettingsPage, { close: noop, logout: noop, openUri: noop }),
      ['settings.grogger_active']
    );
  });
});

/**
 * The offline-library controls only appear once at least one package has been downloaded,
 * and the package rows themselves come from `PackagesState`, which is normally filled in
 * from a JSON file on the device. These three stand-ins are enough to render the section and
 * to reach both package alerts: `Torah` is marked as covered by its parent `Tanakh`, which is
 * what makes tapping it explain that it is already downloaded.
 */
const stubPackagesState = () => {
  for (const key of Object.keys(PackagesState)) { delete PackagesState[key]; }
  const add = (jsonData, order) => {
    PackagesState[jsonData.en] = new Package(jsonData, order);
    return PackagesState[jsonData.en];
  };
  add({ en: 'COMPLETE LIBRARY', he: 'כל הספרייה', size: 1e9, color: 'Other' }, 0);
  add({ en: 'Tanakh', he: 'תנ"ך', size: 1e8, color: 'Tanakh' }, 1).clicked = true;
  const torah = add({ en: 'Torah', he: 'תורה', size: 1e7, color: 'Tanakh', parent: 'Tanakh' }, 2);
  torah.clicked = true;
  torah.supersededByParent = true;
};

describe('Settings screen with the library downloaded', () => {
  const settings = () => wrapWithState(SettingsPage,
    { close: noop, logout: noop, openUri: noop }, { isLoggedIn: true });

  beforeEach(() => {
    Sefaria.isGettinToBePurimTime = jest.fn(() => false);
    stubPackagesState();
  });

  test('renders the offline-library and account controls in both languages', () => {
    expectScreenLocalizes(settings(), [
      'download.check_for_updates', 'download.delete_library',
      // Only shown to a logged-in user.
      'account.logout', 'account.delete_account',
    ]);
  });
});

describe('Alerts from the settings page', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(noop);
    Sefaria.isGettinToBePurimTime = jest.fn(() => false);
    Sefaria.util.epoch_time = jest.fn(() => 1);
    stubPackagesState();
  });
  afterEach(() => { Alert.alert.mockRestore(); });

  const renderSettings = () => {
    let inst;
    act(() => {
      inst = renderer.create(wrapWithState(SettingsPage,
        { close: noop, logout: noop, openUri: noop }, { isLoggedIn: true })());
    });
    return inst;
  };

  /** Presses the button whose visible label is `id`. */
  const pressLabelled = (inst, id) => {
    const wanted = normalize(strings.getString(id));
    const node = inst.root.findAll(n =>
      typeof n.type !== 'string' && typeof n.props.onPress === 'function' &&
      renderedText({ root: n }).some(t => containsAsToken(normalize(t), wanted))
    ).pop();
    if (!node) { throw new Error(`no pressable showing ${id} ("${wanted}")`); }
    act(() => { node.props.onPress(); });
  };

  /**
   * Runs `fn` with setTimeout under the test's control, then discards anything still pending.
   *
   * Tapping a package row starts a 1500ms "ignore a second tap" guard
   * (`preventDoubleTap`, SettingsPage.js:584) that nothing cancels on unmount. Left running,
   * it holds the Jest worker open past the end of the run. setImmediate stays real because
   * `flushPromises` is built on it.
   */
  const withTimersUnderControl = async (fn) => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick', 'performance'] });
    try {
      await fn();
    } finally {
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  };

  test('deleting the library asks for confirmation in both languages', async () => {
    await expectAlertLocalizes(
      () => pressLabelled(renderSettings(), 'download.delete_library'),
      ['download.delete_library', 'download.confirm_delete_library_message',
       'common.yes', 'common.no']
    );
  });

  test('deleting the account asks for confirmation in both languages', async () => {
    await expectAlertLocalizes(
      () => pressLabelled(renderSettings(), 'account.delete_account'),
      ['account.delete_account', 'account.delete_account_message',
       'common.cancel', 'common.ok']
    );
  });

  test('a package covered by its parent says so, in both languages', async () => {
    await withTimersUnderControl(() => expectAlertLocalizes(
      async () => {
        // Tapping "Torah" while "Tanakh" is already downloaded explains that it is included
        // in the parent package rather than starting a second download.
        const inst = renderSettings();
        // The outermost node carrying the row's title is the button; `enText` is threaded
        // down through several layers below it.
        const row = inst.root.findAll(n => n.props.enText === 'Torah')[0];
        await act(async () => { await row.props.onPress(); });
      },
      ['download.already_downloaded', 'download.are_included_in', 'common.ok']
    ));
  });

  test('deleting a package asks for confirmation in both languages', async () => {
    await withTimersUnderControl(() => expectAlertLocalizes(
      async () => {
        // "Tanakh" is downloaded and is nobody's child, so tapping it offers to remove it.
        const inst = renderSettings();
        const row = inst.root.findAll(n => n.props.enText === 'Tanakh')[0];
        await act(async () => { await row.props.onPress(); });
      },
      ['common.delete', 'download.are_you_sure_delete_package', 'common.yes', 'common.no']
    ));
  });

  test('an up-to-date library says so in both languages', async () => {
    // `checkUpdatesFromServer` talks to the update server; stubbed to report nothing to do,
    // which is the branch that produces this alert.
    jest.spyOn(DownloadControl, 'checkUpdatesFromServer').mockResolvedValue([[], []]);
    // Pressing the button disables it while the check runs, and TouchableOpacity animates
    // its own opacity through the native driver on that change — which has no native view
    // to attach to under a renderer test. Stub the animation for the duration.
    jest.spyOn(Animated, 'timing').mockImplementation(() => ({
      start: (cb) => cb && cb({ finished: true }), stop: noop, reset: noop,
    }));
    try {
      await expectAlertLocalizes(
        async () => {
          const inst = renderSettings();
          pressLabelled(inst, 'download.check_for_updates');
          await act(async () => { await flushPromises(); });
        },
        ['download.library_up_to_date', 'download.library_up_to_date_message', 'common.ok']
      );
    } finally {
      DownloadControl.checkUpdatesFromServer.mockRestore();
      Animated.timing.mockRestore();
    }
  });

  test('the account-deleted confirmation renders in both languages', async () => {
    Sefaria.api.deleteUserAccount = jest.fn(async () => ({}));
    await expectAlertLocalizes(
      async () => {
        pressLabelled(renderSettings(), 'account.delete_account');
        pressAlertButton('common.ok');       // confirm the deletion
        await act(async () => { await flushPromises(); });
      },
      ['account.delete_account_ok', 'common.ok']
    );
  });

  test('a failed account deletion reports the error in both languages', async () => {
    Sefaria.api.deleteUserAccount = jest.fn(async () => { throw new Error('server said no'); });
    await expectAlertLocalizes(
      async () => {
        pressLabelled(renderSettings(), 'account.delete_account');
        pressAlertButton('common.ok');
        await act(async () => { await flushPromises(); });
      },
      ['account.delete_account_error', 'common.ok']
    );
  });
});

describe('Lexicon panel', () => {
  test('renders its heading in both languages', () => {
    // The box fires a dictionary lookup for the selected words as soon as it mounts.
    Sefaria.api.lexicon = jest.fn(async () => []);
    expectScreenLocalizes(wrap(LexiconBox, {
      selectedWords: 'בְּרֵאשִׁית', oref: { categories: ['Tanakh'] }, handleOpenURL: noop,
    }), ['connections.define']);
  });
});

describe('Connections text list', () => {
  // The list shows a placeholder line per link while its text loads, and swaps it for an
  // error or an empty-result line depending on what comes back. All three are checked here
  // by handing it one link in each state.
  const commentaryFilter = {
    title: 'Ibn Ezra on Ezra',
    heTitle: 'אבן עזרא על עזרא',
    refList: ['Ibn Ezra on Ezra 1:1', 'Ibn Ezra on Ezra 1:2', 'Ibn Ezra on Ezra 1:3'],
    heRefList: ['אבן עזרא על עזרא א׳:א׳', 'אבן עזרא על עזרא א׳:ב׳', 'אבן עזרא על עזרא א׳:ג׳'],
    category: 'Commentary',
    versionTitle: null,
    versionLanguage: null,
    displayRef: () => false,
    listKey: (i) => `link|${i}`,
  };

  const textListProps = (listContents) => ({
    recentFilters: [commentaryFilter], filterIndex: 0, listContents,
    openRef: noop, loadContent: noop, textLanguage: 'bilingual', themeStr: 'white',
    fontSize: 16, segmentRef: 'Ezra 1:1', connectionsMode: 'Commentary',
    theme: {}, interfaceLanguage: 'english', textListFlex: 0.6, onDragStart: noop,
    onDragMove: noop, onDragEnd: noop, loadNewVersion: noop, handleOpenURL: noop,
  });

  test('the loading, empty and failed states render in both languages', () => {
    expectScreenLocalizes(
      // null = still loading, {error} = the fetch failed, empty strings = nothing came back.
      wrap(TextList, textListProps([null, { error: true, en: '', he: '' }, { en: '', he: '' }])),
      ['common.loading', 'errors.failed_to_load_text', 'errors.no_content']
    );
  });

  test('a filter with no links at all renders its message in both languages', () => {
    expectScreenLocalizes(
      wrap(TextList, { ...textListProps([]), recentFilters: [{ ...commentaryFilter, refList: [], heRefList: [] }] }),
      ['connections.no_connections_message']
    );
  });
});

describe('Download progress bar', () => {
  // Before the first byte arrives the bar says "Connecting"; after that it switches to the
  // percentage line, which is checked among the placeholder strings above.
  test('says it is connecting, in both languages', () => {
    expectScreenLocalizes(wrap(SefariaProgressBar, {
      download: DownloadTracker, identity: 'i18n-test', downloadSize: 1e8,
      downloadNotification: { downloadActive: false },
    }), ['common.connecting']);
  });
});

describe('Dedication footer on Android', () => {
  // `about.dedicated_ios` and `about.dedicated_android` are the same sentence with different
  // line breaks; Jest reports Platform.OS as 'ios', so the Android line needs the platform
  // switched for the duration of the render.
  test('renders the Android wording in both languages', () => {
    const realOS = Platform.OS;
    Platform.OS = 'android';
    try {
      expectScreenLocalizes(wrap(ShortDedication, { openDedication: noop }),
        ['about.dedicated_android']);
    } finally {
      Platform.OS = realOS;
    }
  });
});

describe('Action sheets', () => {
  // "Open …" is an OS action sheet rather than a rendered view, so it is read back off the
  // spy the same way the alerts are.
  beforeEach(() => {
    jest.spyOn(ActionSheet, 'showActionSheetWithOptions').mockImplementation(noop);
  });
  afterEach(() => { ActionSheet.showActionSheetWithOptions.mockRestore(); });

  const sheetText = () => ActionSheet.showActionSheetWithOptions.mock.calls
    .flatMap(([opts]) => opts.options || []);

  const expectSheetLocalizes = (trigger, expectedIds) => {
    markCovered(expectedIds);
    for (const lang of ['en', 'he']) {
      strings.setLanguage(lang);
      ActionSheet.showActionSheetWithOptions.mockClear();
      trigger();
      const normalized = sheetText().map(normalize);
      const notShown = expectedIds.filter(id => !shows(normalized, lang, id));
      expect({ lang, notShown }).toEqual({ lang, notShown: [] });
      expect({ lang, unfilled: sheetText().filter(t => UNFILLED_PLACEHOLDER_RE.test(t)) })
        .toEqual({ lang, unfilled: [] });
    }
  };

  test('opening a specific version is offered in both languages', () => {
    // With a `versions` argument the sheet says "Open Version"; without one it names the
    // text itself, which is content rather than interface language.
    expectSheetLocalizes(
      () => openActionSheet('Genesis 1:1', { en: 'JPS 2006' }, noop, 'english', 'בראשית א׳:א׳'),
      ['common.open_item', 'versions.version']
    );
  });
});

describe('Save button toast', () => {
  // The confirmation is a toast, handed to the component as a callback, so it is captured
  // rather than rendered.
  const expectToastLocalizes = (isSaved, expectedIds) => {
    markCovered(expectedIds);
    Sefaria.history.indexOfSaved = jest.fn(() => (isSaved ? 0 : -1));
    Sefaria.history.saveSavedItem = jest.fn();
    for (const lang of ['en', 'he']) {
      strings.setLanguage(lang);
      const messages = [];
      let inst;
      act(() => {
        inst = renderer.create(wrap(SaveButton, {
          historyItem: { ref: 'Genesis 1:1', he_ref: 'בראשית א׳:א׳', versions: {} },
          showToast: (m) => messages.push(m),
        })());
      });
      act(() => { inst.root.findAllByType(TouchableOpacity)[0].props.onPress(); });
      act(() => { inst.unmount(); });

      const normalized = messages.map(normalize);
      const notShown = expectedIds.filter(id => !shows(normalized, lang, id));
      expect({ lang, notShown }).toEqual({ lang, notShown: [] });
    }
  };

  test('saving confirms in both languages', () => {
    expectToastLocalizes(false, ['history.saved_confirmation']);
  });

  test('un-saving confirms in both languages', () => {
    expectToastLocalizes(true, ['history.removed_confirmation']);
  });
});

describe('Login toast', () => {
  test('a successful login confirms in both languages', async () => {
    // The confirmation is a toast handed in as a prop. Authentication is stubbed to succeed
    // so the success path runs without a network call.
    markCovered(['account.login_successful']);
    Sefaria.api.authenticate = jest.fn(async () => ({}));
    Sefaria._auth = { uid: 1, token: 'stub' };

    for (const lang of ['en', 'he']) {
      strings.setLanguage(lang);
      const messages = [];
      let inst;
      act(() => {
        inst = renderer.create(
          <TestContextWrapper child={AuthPage} childProps={{
            authMode: 'login', close: noop, openLogin: noop, openRegister: noop,
            openUri: noop, syncProfile: noop, showToast: (m) => messages.push(m),
          }} />);
      });
      const submit = inst.root.findAll(n =>
        typeof n.type !== 'string' && typeof n.props.onPress === 'function' &&
        renderedText({ root: n }).some(t => normalize(t) === normalize(strings.account.login))
      ).pop();
      await act(async () => { submit.props.onPress(); await flushPromises(); });
      act(() => { inst.unmount(); });

      expect({ lang, messages: messages.map(normalize) })
        .toEqual({ lang, messages: [normalize(value(lang, 'account.login_successful'))] });
    }
  });
});

describe('Swipe-to-remove on the saved list', () => {
  // Rows arrive from an async `loadData`, so the assertions have to wait for them: the
  // remove button is rendered behind each row and does not exist until there is a row.
  test('renders its label in both languages', async () => {
    Sefaria.primaryCategoryForTitle = jest.fn(() => 'Tanakh');
    await expectSettledScreenLocalizes(wrapWithState(SwipeableCategoryList, {
      close: noop, theme: {}, themeStr: 'white', openRef: noop,
      textLanguage: 'english', interfaceLanguage: 'english',
      onRemove: noop, openSettings: noop, openLogin: noop,
      title: 'Saved', menuOpen: 'saved', icon: iconData.get('bookmark2', 'white'),
      isLoggedIn: true, hasDismissedSyncModal: true, readingHistory: true, dispatch: noop,
      loadData: () => Promise.resolve([
        { ref: 'Genesis 1:1', he_ref: 'בראשית א:א', versions: {}, book: 'Genesis' },
      ]),
    }, { isLoggedIn: true, hasDismissedSyncModal: true }), ['common.remove'], {
      // The button behind the row is only mounted once the row reports its height, and
      // nothing lays anything out under a renderer test — so the layout event is delivered
      // by hand.
      interact: (inst) => inst.root
        .findAll(n => typeof n.props.onLayout === 'function')
        .forEach(n => n.props.onLayout({ nativeEvent: { layout: { height: 44, width: 320 } } })),
    });
  });
});

describe('History and Saved page with nothing in it', () => {
  // The empty-state line only exists once the initial sync has finished and the list has
  // come back with no rows.
  test('says the history is empty, in both languages', async () => {
    Sefaria.history.syncProfile = jest.fn(async () => ({}));
    Sefaria.history.history = [];
    Sefaria.history.saved = [];
    await expectSettledScreenLocalizes(
      wrap(HistorySavedPage, { openRef: noop, openMenu: noop, hasInternet: true }),
      ['history.no_history']
    );
  });
});

describe('Topics', () => {
  const topicData = {
    slug: 'passover', primaryTitle: 'Passover', title: 'Passover',
    heTitle: 'פסח', description: { en: 'The festival of freedom.', he: 'חג החירות.' },
    textRefs: ['Exodus 12:1'], textData: [], indexes: [],
    parasha: null, subclass: null,
  };

  const topicProps = (overrides) => ({
    topic: { slug: 'passover', title: 'Passover', primaryTitle: 'Passover' },
    onBack: noop, openNav: noop, openTopic: noop, showToast: noop, openRef: noop,
    setTopicsTab: noop, topicsTab: 'sources', openUri: noop, ...overrides,
  });

  beforeEach(() => {
    Sefaria.topic_toc = [];
    Sefaria._topicTocPages = { null: [] };
    Sefaria.api.topic = jest.fn(async () => topicData);
    Sefaria.api.getParashaNextRead = jest.fn(async () => ({}));
    Sefaria.api.getBulkText = jest.fn(async () => ({}));
    Sefaria.topicTocPage = jest.fn(() => []);
    Sefaria.getTopicTocObject = jest.fn(() => null);
    // The trending list is what carries the heading; without it the section is not rendered
    // at all. `_trendingTags` is the cache the component reads before the request returns.
    const trending = [{ slug: 'passover', title: 'Passover', heTitle: 'פסח' }];
    Sefaria.api._trendingTags = trending;
    Sefaria.api.trendingTags = jest.fn(async () => trending);
  });

  test('a topic with sources names its tab in both languages', async () => {
    await expectSettledScreenLocalizes(wrap(TopicPage, topicProps()), ['common.sources']);
  });

  test('an author page names its works tab in both languages', async () => {
    Sefaria.api.topic = jest.fn(async () => ({
      ...topicData, subclass: 'author', indexes: [{ title: 'Guide for the Perplexed' }],
    }));
    await expectSettledScreenLocalizes(
      wrap(TopicPage, topicProps({ topicsTab: 'works' })), ['topics.works_on_sefaria']);
  });

  test('a parasha page offers to read the portion, in both languages', async () => {
    // `ref` has to be the {en, he} pair the header button reads, not a bare string.
    Sefaria.api.topic = jest.fn(async () => ({
      ...topicData,
      parasha: 'Bereshit',
      ref: { en: 'Genesis 1:1-6:8', he: 'בראשית א׳:א׳-ו׳:ח׳' },
    }));
    // An empty array is the shape this returns when there is no upcoming reading, and it
    // keeps the readings table (dates, haftarah list — all content, no interface strings)
    // out of the way. The button under test is in the page header.
    Sefaria.api.getParashaNextRead = jest.fn(async () => []);
    await expectSettledScreenLocalizes(
      wrap(TopicPage, topicProps()), ['learning_schedules.read_the_portion']);
  });

  test('the topics landing page heads its list in both languages', async () => {
    await expectSettledScreenLocalizes(
      wrap(TopicCategory, { topic: null, openTopic: noop, onBack: noop, openNav: noop }),
      ['topics.trending_topics']);
  });
});

describe('The app-wide error alert', () => {
  beforeEach(() => { jest.spyOn(Alert, 'alert').mockImplementation(noop); });
  afterEach(() => { Alert.alert.mockRestore(); });

  test('renders in both languages', async () => {
    await expectAlertLocalizes(generalAppErrorAlert,
      ['errors.general_error_alert_title', 'errors.general_error_alert_message', 'common.ok']);
  });
});

/**
 * Strings no scenario in this file exercises, each with the reason why.
 *
 * The list is guarded in both directions, the same way `KNOWN_UNUSED` is in `i18n.test.js`:
 *
 *   - Nothing may be uncovered that is not on the list, so a string added in Weblate cannot
 *     slip in untested. Someone has to write a scenario for it, or make the deliberate choice
 *     of adding it here with a reason.
 *   - Nothing may stay on the list once it is covered, so the list cannot quietly go stale.
 *
 * Every entry below is a string no user can currently reach, not a screen nobody got round
 * to testing. If a string here starts being displayed again, delete its line and write the
 * scenario — do not append to this list without a reason written down.
 */
const NOT_YET_COVERED = [
  // ---------------------------------------------------------------------------------------
  // Dead: nothing in the app reads these at all. They are the same set `KNOWN_UNUSED` in
  // i18n.test.js lists, and no render test can reach a string that no code looks up. They
  // are kept in the JSON rather than deleted because deleting them also throws away Hebrew a
  // translator wrote; see the note on KNOWN_UNUSED.
  'about.about', 'about.feedback', 'about.support_sefaria',
  // The login screen's three-bullet pitch ("Save texts" / "Sync your reading" /
  // "Get updates"), replaced by the Google and Apple buttons in 3b570bff.
  'account.get_updates', 'account.save_texts', 'account.sync_your_reading',
  'common.apply', 'common.back', 'common.by', 'common.clear_all', 'common.of',
  'download.are_you_sure_delete_download_progress', 'download.download_in_progress',
  'download.download_library', 'download.download_paused', 'download.download_updates',
  'download.downloading', 'download.how_to_resume_download_message',
  'download.library_downloading', 'download.library_downloading_message', 'download.pause',
  'download.resume_download', 'download.texts_downloaded',
  'errors.connect_to_search_message', 'errors.connect_to_versions_message',
  'learning_schedules.haftara', 'learning_schedules.parashah',
  'nav.browse', 'nav.calendar',
  'search.filter_by_text', 'search.results',
  'topics.views',
  'versions.compare', 'versions.read', 'versions.versions',

  // ---------------------------------------------------------------------------------------
  // Looked up by code that runs, but that no user can reach. Each of these is a bug or a
  // leftover rather than a gap in this file — the id resolves, so `i18n.test.js` counts it as
  // used, but nothing ever puts it on a screen.

  // AccountNavigationMenu.js: both menu entries are commented out (see MenuItemsMeta._items).
  // The quoted ids inside the comment are why i18n.test.js still counts them as referenced.
  'account.profile', 'account.updates',

  // TextSegment.js:71 builds an action sheet offering Copy / Share / Cancel, but the
  // `onLongPress` callback it defines is never passed to the TouchableOpacity below it, so
  // the sheet never opens. `common.share` and `common.cancel` are covered elsewhere;
  // `common.copy` appears nowhere else.
  'common.copy',

  // SettingsPage.js: the update button is given `text={strings.download.checking}` and
  // `isLoading` at the same moment, and SystemButton renders a spinner instead of its text
  // while loading — so this label is computed and then thrown away.
  'download.checking',

  // DownloadControl.js: raised from inside downloadBundle's catch, which needs a download
  // that starts and then fails partway through. Reaching it from a test would mean driving
  // the whole bundle-download state machine.
  'download.download_error', 'download.download_error_message',

  // search/SearchFilterPage.js: used only as a key into ButtonToggleSetData's lookup table
  // (`buttonToggleSetData.get(strings.search.exact_search)`). The user sees
  // `search.exact_matches_only` next to that toggle, never this string.
  'search.exact_search',
];

describe('coverage of the whole string table', () => {
  const allIds = NAMESPACES.flatMap(ns => Object.keys(en[ns]).map(leaf => `${ns}.${leaf}`));

  test('the allowlist names only real ids', () => {
    // Catches a typo in the list, and an id deleted from the JSON but left behind here.
    expect(NOT_YET_COVERED.filter(id => !allIds.includes(id))).toEqual([]);
  });

  test('no id is untested beyond the allowlist', () => {
    expect(allIds.filter(id => !COVERED.has(id) && !NOT_YET_COVERED.includes(id))).toEqual([]);
  });

  test('every allowlist entry is still genuinely untested', () => {
    expect(NOT_YET_COVERED.filter(id => COVERED.has(id))).toEqual([]);
  });

  test('reports how much of the string table is covered', () => {
    // Not an assertion about a number anyone has to keep updating — it prints the score so a
    // run of this file answers "how far along are we?" without anyone counting by hand.
    const pct = Math.round((COVERED.size / allIds.length) * 100);
    console.log(`i18n render coverage: ${COVERED.size}/${allIds.length} strings (${pct}%), ` +
                `${NOT_YET_COVERED.length} on the allowlist`);
    expect(COVERED.size + NOT_YET_COVERED.length).toBe(allIds.length);
  });
});
