import Sefaria from '../sefaria';

describe('sefaria url', () => {
    test('urlToRef simple', () => {
        const testTitle = 'Genesis';
        Sefaria.booksDict[testTitle] = 1;
        const url = "Genesis.11.1"
        const { ref, title } = Sefaria.urlToRef(url);
        expect(title).toBe(testTitle);
        expect(ref).toBe("Genesis 11:1");
    });
    test('urlToRef complex', () => {
        const testTitle = 'Midrash Tanchuma Buber';
        Sefaria.booksDict[testTitle] = 1;
        const url = "Midrash_Tanchuma_Buber,_Bereshit.11.1";
        const { ref, title } = Sefaria.urlToRef(url);
        expect(title).toBe(testTitle);
        expect(ref).toBe("Midrash Tanchuma Buber, Bereshit 11:1");
    });
    test('urlToRef complex number at end', () => {
        // NOTE: original URL had URL encoded entities (e.g. %2C)
        // by the time it gets to Sefaria.urlToRef, these have been converted to normal form (e.g. comma)
        const testTitle = 'Guide for the Perplexed'
        Sefaria.booksDict[testTitle] = 1;
        const url = "Guide_for_the_Perplexed,_Part_2.1";
        const { ref, title } = Sefaria.urlToRef(url);
        expect(title).toBe(testTitle);
        expect(ref).toBe("Guide for the Perplexed, Part 2 1");
    })
});

describe('htmlToTextCanonical', () => {
    test('matches canonical html-to-text cases', () => {
        const cases = [
            ['nbsp_decodes_to_unicode_nbsp', 'a&nbsp;b', `a\u00a0b`],
            ['thinsp_decodes_to_unicode_thin_space', 'a&thinsp;b', `a\u2009b`],
            ['numeric_entities_decode', 'x&#160;y&#x2009;z', `x\u00a0y\u2009z`],
            ['br_becomes_newline', 'a<br>b<br />c<br/>d', 'a\nb\nc\nd'],
            ['literal_newlines_removed_before_br', 'a\nb<br>c', 'ab\nc'],
            ['div_and_p_close_become_newlines', '<div>a</div><p>b</p>c', 'a\nb\nc'],
            ['table_cells_become_tabs_and_rows_newlines', '<table><tr><td>1</td><td>2</td></tr></table>', '1\t2\t\n'],
            ['collapse_duplicate_blank_lines', 'a<br><br>b', 'a\nb'],
        ];
        for (const [name, input, expected] of cases) {
            expect(Sefaria.util.htmlToTextCanonical(input)).toBe(expected);
        }
    });

    test('strips tags and decodes named spacing entities to unicode spaces', () => {
        const input = '<span>foo&nbsp;bar&thinsp;baz</span>';
        expect(Sefaria.util.htmlToTextCanonical(input)).toBe(`foo\u00a0bar\u2009baz`);
    });

    test('preserves unicode nbsp and thin space (canonical behavior)', () => {
        const input = `a\u00a0b\u2009c`;
        expect(Sefaria.util.htmlToTextCanonical(input)).toBe(`a\u00a0b\u2009c`);
    });

    test('decodes numeric spacing entities to unicode spaces', () => {
        expect(Sefaria.util.htmlToTextCanonical('x&#160;y&#8201;z')).toBe(`x\u00a0y\u2009z`);
        expect(Sefaria.util.htmlToTextCanonical('x&#xA0;y&#x2009;z')).toBe(`x\u00a0y\u2009z`);
    });

    test('decodes Hebrew numeric entities to characters', () => {
        expect(Sefaria.util.htmlToTextCanonical('&#1488;')).toBe('\u05d0');
    });

    test('decodes &amp; for plain text', () => {
        expect(Sefaria.util.htmlToTextCanonical('a &amp; b')).toBe('a & b');
    });

    test('decodes common typography named entities', () => {
        expect(Sefaria.util.htmlToTextCanonical('&ldquo;Hi&rdquo;')).toBe('\u201cHi\u201d');
        expect(Sefaria.util.htmlToTextCanonical('a&mdash;b&ndash;c')).toBe('a\u2014b\u2013c');
        expect(Sefaria.util.htmlToTextCanonical('&hellip;')).toBe('\u2026');
    });

    test('decodes numeric punctuation and Latin-1', () => {
        expect(Sefaria.util.htmlToTextCanonical('&#8212;')).toBe('\u2014');
        expect(Sefaria.util.htmlToTextCanonical('&#233;')).toBe('\u00e9');
    });

    test('preserves invisible bidi marks and zero-width characters (canonical behavior)', () => {
        expect(Sefaria.util.htmlToTextCanonical(`a\u200eb\u200fc`)).toBe(`a\u200eb\u200fc`);
        expect(Sefaria.util.htmlToTextCanonical('x\u200by')).toBe('x\u200by');
        expect(Sefaria.util.htmlToTextCanonical('\ufeffhello')).toBe('\ufeffhello');
    });

    test('double-encoded &amp;quot; decodes only once (canonical behavior)', () => {
        expect(Sefaria.util.htmlToTextCanonical('&amp;quot;x&amp;quot;')).toBe('&quot;x&quot;');
    });
});