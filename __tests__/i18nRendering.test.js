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
import { Text, Alert } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import strings from '../LocalizedStrings';
import en from '../i18n/en.json';
import he from '../i18n/he.json';
import TestContextWrapper from '../TestContextWrapper';
import SettingsPage from '../SettingsPage';
import { AuthPage } from '../AuthPage';
import { AccountNavigationMenu } from '../AccountNavigationMenu';
import ConnectionsPanel from '../ConnectionsPanel';
import { promptLibraryUpdate, doubleDownload } from '../DownloadControl';

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

/** Text nodes render strings, numbers, or nested arrays of them. Flatten to plain strings. */
const flattenChildren = (children, acc = []) => {
  if (Array.isArray(children)) children.forEach(c => flattenChildren(c, acc));
  else if (typeof children === 'string' || typeof children === 'number') acc.push(String(children));
  return acc;
};

const renderedText = (inst) =>
  inst.root.findAllByType(Text).flatMap(node => flattenChildren(node.props.children));

/**
 * Renders `element` with the interface strings set to `lang` and returns every string the
 * user would see. act() is required: these screens set state while mounting, and without it
 * react-test-renderer unmounts the tree before assertions can read it.
 */
const renderIn = (lang, buildElement) => {
  strings.setLanguage(lang);
  let inst;
  act(() => { inst = renderer.create(buildElement()); });
  const texts = renderedText(inst);
  act(() => { inst.unmount(); });
  return texts;
};

// Strings are often concatenated with surrounding punctuation or spaces (" Log in."), so
// compare on a normalized form rather than demanding an exact node match.
const normalize = (s) => s.trim().replace(/[.:]+$/, '');

/**
 * The shared body of every screen case: render in both languages and check that each
 * expected string shows up in its own language and that no English leaks into Hebrew.
 *
 * @param buildElement  () => JSX for the screen under test
 * @param expectedIds   ids the screen must display; keep these to text that is always
 *                      visible in the rendered state, not text behind a tap or a fetch
 */
const expectScreenLocalizes = (buildElement, expectedIds) => {
  const byLang = { en: renderIn('en', buildElement), he: renderIn('he', buildElement) };

  for (const lang of ['en', 'he']) {
    const texts = byLang[lang];
    const normalized = texts.map(normalize);

    const notShown = expectedIds.filter(id => !normalized.includes(normalize(value(lang, id))));
    expect({ lang, notShown }).toEqual({ lang, notShown: [] });

    const unfilled = texts.filter(t => UNFILLED_PLACEHOLDER_RE.test(t));
    expect({ lang, unfilled }).toEqual({ lang, unfilled: [] });

    const rawIds = texts.filter(t => RAW_ID_RE.test(t.trim()));
    expect({ lang, rawIds }).toEqual({ lang, rawIds: [] });
  }

  // Every string on this screen has a distinct Hebrew translation (i18n.test.js proves no
  // en/he pair is identical), so an English value showing up in the Hebrew render means
  // that label never went through the string table.
  const heNormalized = byLang.he.map(normalize);
  const leaked = expectedIds.filter(id => heNormalized.includes(normalize(value('en', id))));
  expect(leaked).toEqual([]);
};

const noop = () => {};

const wrap = (child, childProps) => () => (
  <TestContextWrapper child={child} childProps={childProps} />
);

afterAll(() => { strings.setLanguage('en'); });

describe('Settings screen', () => {
  test('renders its labels in both languages', () => {
    Sefaria.isGettinToBePurimTime = jest.fn(() => false);
    expectScreenLocalizes(
      wrap(SettingsPage, { close: noop, logout: noop, openUri: noop }),
      [
        'settings.text_language', 'languages.english', 'languages.hebrew', 'settings.bilingual',
        'settings.interface_language',
        'settings.email_frequency', 'settings.daily', 'settings.weekly', 'settings.never',
        'settings.reading_history', 'common.on_fem', 'common.off_fem',
        'settings.preferred_custom', 'settings.sephardi', 'settings.ashkenazi',
        'settings.download_network_setting', 'settings.wifi_only', 'settings.mobile_network',
        'settings.offline_access', 'settings.system', 'settings.terms_and_privacy',
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
      'account.login', 'account.save_texts', 'account.sync_your_reading', 'account.get_updates',
      'account.dont_have_an_account', 'account.create_an_account', 'account.forgot_password',
    ]);
  });

  test('register renders its labels in both languages', () => {
    expectScreenLocalizes(wrap(AuthPage, authProps('register')), [
      'account.signup', 'account.save_texts', 'account.sync_your_reading', 'account.get_updates',
      'account.already_have_an_account', 'account.login',
      'account.by_clicking_sign_up', 'account.terms_of_use_and_privacy_policy',
    ]);
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

  test('a selected category renders its labels in both languages', () => {
    // No expected ids: with a category open the panel is almost all data (book names and
    // counts). This case exists to prove that state renders at all in Hebrew without
    // leaking a raw id or an unfilled placeholder.
    expectScreenLocalizes(wrap(ConnectionsPanel, ezraProps('Commentary')), []);
  });
});

describe('Download dialogs', () => {
  // These are Alert.alert calls rather than rendered components, and they carry the
  // placeholder strings the migration introduced, so they are checked directly.
  beforeEach(() => { jest.spyOn(Alert, 'alert').mockImplementation(noop); });
  afterEach(() => { Alert.alert.mockRestore(); });

  const alertText = () => Alert.alert.mock.calls.flatMap(([title, body, buttons]) =>
    [title, body, ...(buttons || []).map(b => b.text)].filter(t => typeof t === 'string'));

  test('library-update prompt substitutes its counts in both languages', () => {
    for (const lang of ['en', 'he']) {
      strings.setLanguage(lang);
      Alert.alert.mockClear();
      promptLibraryUpdate(['a', 'b', 'c'], ['a'], 'wifiOnly');

      const texts = alertText();
      expect(texts).toContain(value(lang, 'download.update_library'));
      expect(texts).toContain(value(lang, 'download.download'));
      expect(texts).toContain(value(lang, 'common.not_now'));

      // "1" new book and "2" updates must be substituted into the body, not left as {count}.
      const body = Alert.alert.mock.calls[0][1];
      expect(body).not.toMatch(UNFILLED_PLACEHOLDER_RE);
      expect(body).toContain('1');
      expect(body).toContain('2');
      expect(body).toContain(value(lang, 'download.new_books_available').split('{')[0].trim());
    }
  });

  test('double-download warning is translated', () => {
    for (const lang of ['en', 'he']) {
      strings.setLanguage(lang);
      Alert.alert.mockClear();
      doubleDownload();
      expect(alertText()).toContain(value(lang, 'download.double_download'));
    }
  });
});
