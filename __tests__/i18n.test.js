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

  test('the runtime map exposes every id in both languages', () => {
    for (const lang of ['en', 'he']) {
      strings.setLanguage(lang);
      const missing = Object.keys(flatEn).filter(id => strings.getString(id) === null);
      expect(missing).toEqual([]);
    }
    strings.setLanguage('en');
  });
});

describe('i18n ids referenced in source', () => {
  const collectSourceFiles = (dir, acc = []) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) collectSourceFiles(full, acc);
      else if (/\.jsx?$/.test(entry.name)) acc.push(full);
    }
    return acc;
  };

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
