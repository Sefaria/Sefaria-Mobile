import LocalizedStrings from 'react-native-localization';
import en from './i18n/en.json';
import he from './i18n/he.json';

/**
 * Interface strings, grouped into namespaces (`common`, `settings`, `search`, ...).
 *
 * The two JSON files are the source of truth and are managed in Weblate, so they must
 * always share an identical key set. Both are checked by `__tests__/i18n.test.js`.
 *
 * Usage:
 *   strings.common.cancel                       // static lookup
 *   strings.getString('common.cancel')          // dynamic lookup by dotted id
 *   strings.formatString(strings.common.open_item, { item: title })   // with placeholders
 *
 * To add a string, add the same id to BOTH en.json and he.json. Ids must be
 * snake_case with exactly two segments (`namespace.leaf`) — Weblate does not enforce this,
 * so the test does. Indent the JSON with 4 spaces: Weblate re-serializes at 4 and a 2-space
 * file produces a ~1,000-line phantom diff on every translator save.
 *
 * A string with no Hebrew translation yet shows its English text — see `withFallback`.
 */

/**
 * Turns the flat `{"common.ok": "OK"}` file into the nested `{common: {ok: "OK"}}` shape
 * `localized-strings` needs.
 *
 * The files are flat because that is the shape Weblate works with. The library is not: it
 * resolves BOTH `strings.common.ok` and `strings.getString('common.ok')` by splitting the id
 * on the dot and walking down an object tree. Handed a flat table it finds neither — member
 * access gives `undefined` and `getString` returns `null` — so the un-flattening here is what
 * lets 200-plus call sites keep reading `strings.common.ok`.
 *
 * Splits on the FIRST dot only, so `namespace` and `leaf` stay unambiguous. `i18n.test.js`
 * holds ids to exactly two segments, which is what keeps that split lossless.
 */
const unflatten = (flat) => Object.entries(flat).reduce((acc, [id, value]) => {
  const dot = id.indexOf('.');
  const ns = id.slice(0, dot);
  (acc[ns] = acc[ns] || {})[id.slice(dot + 1)] = value;
  return acc;
}, {});

/**
 * Returns `translation` with every empty value replaced by its English source.
 *
 * Weblate marks an untranslated string by leaving its value empty, which is what a
 * developer adding a new string writes too — the Hebrew arrives later, once a translator
 * gets to it. `localized-strings` treats "" as a real value and renders it, so without
 * this an untranslated string is a BLANK label to Hebrew users rather than an English one.
 * It does fall back on its own when the key is absent entirely — but relying on that would
 * mean betting on Weblate omitting untranslated keys rather than emptying them, so this
 * handles both shapes and the app stays correct either way.
 *
 * Filling from English means an untranslated id has the same text in both languages. That
 * is a normal, temporary state, so nothing may assume the two languages always differ —
 * see the leak check in `__tests__/i18nRendering.test.js`, which skips those ids.
 */
const withFallback = (source, translation) => Object.fromEntries(
  Object.entries(source).map(([id, value]) => {
    const translated = translation[id];
    return [id, (translated || '').trim() ? translated : value];
  })
);

/**
 * The nested, fallback-filled tables handed to the string library.
 *
 * Exported so a test that swaps `strings.setContent` for its own tables can put the real ones
 * back exactly as they were — `strings` is a process-wide singleton, and restoring the raw
 * flat imports instead would leave every later test with a broken table.
 */
export const buildContent = () => ({
  en: unflatten(en),
  he: unflatten(withFallback(en, he)),
});

const strings = new LocalizedStrings(buildContent());

export default strings;
