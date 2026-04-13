# HTML-to-Text Normalization Spec (Canonical)

This document defines the **canonical** HTML-to-text normalization behavior used by Sefaria for “copy as plain text”.

## Canonical reference implementation (Web)

Canonical code lives in:
- `Sefaria-Project/static/js/sefaria/util.js` (`Sefaria.util.htmlToText`)
- `Sefaria-Project/static/js/ReaderApp.jsx` (`handleCopyEvent` sets `text/plain` to `Sefaria.util.htmlToText(html)`)

This repo’s goal is to match that output **byte-for-byte**.

## Algorithm

Given an input string `html`:

1. Replace all literal `\n` with `""`.
2. Replace all literal `\t` with `""`.
3. Replace these exact substrings (case-sensitive):
   - `</td>` → `\t`
   - `</table>` → `\n`
   - `</tr>` → `\n`
   - `</p>` → `\n`
   - `</div>` → `\n`
   - `<br>` → `\n`
   - `<br( )*/>` → `\n`
4. Decode entities and strip tags by parsing HTML, then take body text content.
5. Collapse duplicate blank lines: `\n\s*\n` → `\n`.

## Tests

Test cases are kept inline in this repo’s tests (no external JSON fixture).

