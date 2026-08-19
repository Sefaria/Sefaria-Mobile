import fs from 'fs';
import path from 'path';
import en from '../i18n/en.json';
import he from '../i18n/he.json';
import strings from '../LocalizedStrings';

const REPO = path.join(__dirname, '..');

// Same shape Sefaria-Project enforces: lowercase snake_case segments, at least two of them.
// Weblate does NOT validate key names, so a translator (or a sync) can introduce a camelCase
// key that the app silently fails to resolve. This test is the guard against that.
const ID_RE = /^[a-z0-9_]+(\.[a-z0-9_]+)+$/;

/** Flattens {ns: {leaf: value}} into {"ns.leaf": value}. */
const flatten = (obj) => Object.entries(obj).reduce((acc, [ns, leaves]) => {
  Object.entries(leaves).forEach(([leaf, value]) => { acc[`${ns}.${leaf}`] = value; });
  return acc;
}, {});

const flatEn = flatten(en);
const flatHe = flatten(he);

describe('i18n string files', () => {
  test('every id is lowercase snake_case with at least two segments', () => {
    const bad = [...Object.keys(flatEn), ...Object.keys(flatHe)].filter(id => !ID_RE.test(id));
    expect(bad).toEqual([]);
  });

  test('en.json and he.json define exactly the same ids', () => {
    const enIds = Object.keys(flatEn).sort();
    const heIds = Object.keys(flatHe).sort();
    expect(heIds.filter(id => !(id in flatEn))).toEqual([]);  // extra in he
    expect(enIds.filter(id => !(id in flatHe))).toEqual([]);  // missing from he
  });

  test('no English source value is empty', () => {
    // An empty Hebrew value is legal (it renders blank on purpose), but an empty English
    // value means the source string is missing and Weblate has nothing to translate.
    expect(Object.entries(flatEn).filter(([, v]) => !v || !v.trim()).map(([k]) => k)).toEqual([]);
  });

  test('placeholders match between en and he', () => {
    // formatString substitutes by name, so a placeholder that exists in one language but
    // not the other renders a literal "{platform}" to those users.
    const names = (s) => (s.match(/\{[a-z_][a-z0-9_]*\}/g) || []).sort();
    const mismatched = Object.keys(flatEn)
      .filter(id => JSON.stringify(names(flatEn[id])) !== JSON.stringify(names(flatHe[id])))
      .map(id => `${id}: en=${names(flatEn[id])} he=${names(flatHe[id])}`);
    expect(mismatched).toEqual([]);
  });

  test('no id has the same text in both languages', () => {
    // `i18nRendering.test.js` decides that a label never went through the string table by
    // spotting its English value in a Hebrew render. That only works while every string has
    // a Hebrew translation that differs from its English source, which is true today but is
    // not something Weblate enforces — a translator can paste the English straight through.
    // If this ever fails, either the translation is missing, or that leak check has to be
    // relaxed for the id in question.
    const identical = Object.keys(flatEn)
      .filter(id => flatHe[id].trim() && flatEn[id].trim() === flatHe[id].trim());
    expect(identical).toEqual([]);
  });

  test('the runtime map exposes every id in both languages', () => {
    for (const lang of ['en', 'he']) {
      strings.setLanguage(lang);
      const missing = Object.keys(flatEn).filter(id => strings.getString(id) === null);
      expect(missing).toEqual([]);
    }
    strings.setLanguage('en');
  });
});

const collectSourceFiles = (dir, acc = [], { skipTests = false } = {}) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    if (skipTests && entry.name === '__tests__') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectSourceFiles(full, acc, { skipTests });
    else if (/\.jsx?$/.test(entry.name)) acc.push(full);
  }
  return acc;
};

describe('i18n ids referenced in source', () => {
  test('every id referenced in source exists in the string files', () => {
    const namespaces = Object.keys(en);
    // strings.common.cancel  /  strings.getString('common.cancel')
    const memberRe = new RegExp(`\\bstrings\\.(${namespaces.join('|')})\\.([a-z0-9_]+)`, 'g');
    const getStringRe = /getString\(\s*['"]([a-z0-9_]+(?:\.[a-z0-9_]+)+)['"]\s*\)/g;
    // stringKey={"common.cancel"} / titleKey: 'search.sort_by' / prefixTextKey={'topics.…'}
    const propRe = /\b(?:stringKey|titleKey|sectionTitleKey|prefixTextKey|elementKey)\s*[:=]\s*\{?\s*['"]([a-z0-9_]+(?:\.[a-z0-9_]+)+)['"]/g;

    const missing = [];
    for (const file of collectSourceFiles(REPO)) {
      const src = fs.readFileSync(file, 'utf8');
      const rel = path.relative(REPO, file);
      for (const re of [memberRe, getStringRe, propRe]) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(src)) !== null) {
          const id = re === memberRe ? `${m[1]}.${m[2]}` : m[1];
          if (!(id in flatEn)) missing.push(`${rel}: ${id}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

/**
 * Ids that exist in en.json and he.json but that no app code reads.
 *
 * They are listed rather than deleted because deleting one also throws away Hebrew a
 * translator wrote. Which of them to delete is a call for the team, not for this test — so
 * each is filed below under why it went quiet, traced back to the commit that dropped it.
 *
 * The point of the list is that it must not grow: a new unused id means a string was added
 * to Weblate that nothing displays, or a screen stopped using one. Wire the id up, or delete
 * it from both JSON files — do not append to this list.
 */
const KNOWN_UNUSED = [
  // === Regressions: the feature is still there, the message is not. Wire these back up. ===

  // The search page used to tell an offline user why there were no results. The line that
  // did it went out with the `status` variable in ce5e45f8 (2023-01-29,
  // "chore(search): follow pycharm suggestions to clean up code") — collateral damage in a
  // tidy-up, not a decision. Offline search now just shows an empty result list.
  'errors.connect_to_search_message',

  // Same shape: TranslationsBox had an `apiError` branch that said "Connect to the internet
  // to read other versions." f1c1df0e (2024-03-26, the api-v3 translations refactor) deleted
  // the branch, so a failed versions fetch is now indistinguishable from a text that has no
  // other versions.
  'errors.connect_to_versions_message',

  // === Not used on master, but do not delete: an unmerged branch needs it. ===

  // Used by the in-flight auth work (48a4cfcf, on feature/sc-45083-sso-google-apple-signin
  // and feature/sc-46734-google-account-chooser-on-login). Deleting it breaks those branches.
  'common.back',

  // === Removed features. The screens that displayed these no longer exist. ===

  // The 2020 downloader rewrite: 0a118f48 ("deleted old packages and downloader files") and
  // 681ab892 ("separating download logic from UI concerns") took out the pause/resume UI.
  'download.are_you_sure_delete_download_progress',
  'download.download_paused',
  'download.how_to_resume_download_message',
  'download.library_downloading',
  'download.library_downloading_message',
  'download.pause',
  'download.resume_download',

  // The package-download UI that preceded it (2018–2020).
  'download.download_in_progress',
  'download.download_library',
  'download.download_updates',
  'download.downloading',
  'download.texts_downloaded',

  // The 2023 navigation rewrite: da2f15c9 ("basic new texts page") and 1123abe5
  // ("chore: remove unused file") replaced the old menu.
  'about.about',
  'about.feedback',
  'nav.browse',
  'nav.calendar',

  // The 2023 search-filter refactor (4d5000c6, 22e645fe, aeb2d8d0) replaced the
  // Apply / Clear All footer and the filter-by-text field with the current design.
  'common.apply',
  'common.clear_all',
  'search.filter_by_text',

  // Sheets came out of the app in November 2025 (63252a7d, e51c51c6, b6d75f7d).
  'topics.views',
  'versions.read',

  // Older versions-box changes: the compare button went in 2018 (022355a8) and the section
  // was renamed from "Versions" to "Translations" in 2020 (1f6c3029).
  'versions.compare',
  'versions.versions',

  // Superseded by a full sentence with placeholders, or by a rewrite of the screen.
  'about.support_sefaria',   // donate button reworked, 5e4f8fb7 (2019)
  'common.by',               // now part of `topics.this_source_is_connected_to`
  'common.of',               // now part of `download.downloading_progress`
  'search.results',          // search results summary rewritten, 98629944 (2019)

  // Calendar entries have come from the calendar data, not from fixed labels, since 57274340
  // (2016-12-06).
  'learning_schedules.haftara',
  'learning_schedules.parashah',
];

describe('unused i18n ids', () => {
  const namespaces = Object.keys(en);
  const nsAlternation = namespaces.join('|');

  // Tests are excluded on purpose: an id that only a test mentions is not shown to any user.
  const appSource = collectSourceFiles(REPO, [], { skipTests: true })
    .map(f => fs.readFileSync(f, 'utf8'))
    .join('\n');

  const matchAll = (re) => [...appSource.matchAll(re)];

  // strings.common.cancel
  const referenced = new Set(
    matchAll(new RegExp(`\\bstrings\\.(${nsAlternation})\\.([a-z0-9_]+)`, 'g')).map(m => `${m[1]}.${m[2]}`)
  );
  // Any quoted id: getString('common.cancel'), titleKey="account.help", and the lookup tables
  // in SettingsPage.js that map a state value to an id.
  matchAll(new RegExp(`['"\`]((?:${nsAlternation})\\.[a-z0-9_]+)['"\`]`, 'g')).forEach(m => referenced.add(m[1]));

  // Two namespaces are addressed by ids assembled at runtime, so no literal id appears in
  // source and every key under them would look unused:
  //   TranslationsBox.js  strings.getString(`languages.${isoCode}`)
  //   VersionBlock.js     strings.getString('licenses.' + license.toLowerCase()…)
  // Treat the whole namespace as referenced when either form shows up.
  const dynamicNamespaces = new Set([
    ...matchAll(new RegExp(`[\`']((?:${nsAlternation}))\\.\\$\\{`, 'g')).map(m => m[1]),
    ...matchAll(new RegExp(`['"]((?:${nsAlternation}))\\.['"]\\s*\\+`, 'g')).map(m => m[1]),
  ]);

  const unused = Object.keys(flatEn)
    .filter(id => !referenced.has(id) && !dynamicNamespaces.has(id.split('.')[0]))
    .sort();

  test('the namespaces built at runtime are detected, so their keys are not called unused', () => {
    expect([...dynamicNamespaces].sort()).toEqual(['languages', 'licenses']);
  });

  test('no id is unused beyond the known-dead list', () => {
    expect(unused.filter(id => !KNOWN_UNUSED.includes(id))).toEqual([]);
  });

  test('every id on the known-dead list is still unused', () => {
    // Keeps the list honest: once a dead string is wired up or deleted, it must leave the list.
    expect(KNOWN_UNUSED.filter(id => !unused.includes(id))).toEqual([]);
  });
});
