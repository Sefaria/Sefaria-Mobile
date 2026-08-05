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
 * snake_case (`/^[a-z0-9_]+(\.[a-z0-9_]+)+$/`) — Weblate does not enforce this, so the
 * test does. Indent the JSON with 4 spaces: Weblate re-serializes at 4 and a 2-space
 * file produces a ~1,000-line phantom diff on every translator save.
 */
const strings = new LocalizedStrings({ en, he });

export default strings;
