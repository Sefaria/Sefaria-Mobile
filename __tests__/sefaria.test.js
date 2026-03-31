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

describe('plainTextFromSegmentHtml', () => {
    test('strips tags and replaces named spacing entities with space', () => {
        const input = '<span>foo&nbsp;bar&thinsp;baz</span>';
        expect(Sefaria.util.plainTextFromSegmentHtml(input)).toBe('foo bar baz');
    });

    test('replaces unicode nbsp and thin space with regular space', () => {
        const input = `a\u00a0b\u2009c`;
        expect(Sefaria.util.plainTextFromSegmentHtml(input)).toBe('a b c');
    });

    test('decodes numeric spacing entities', () => {
        expect(Sefaria.util.plainTextFromSegmentHtml('x&#160;y&#8201;z')).toBe('x y z');
        expect(Sefaria.util.plainTextFromSegmentHtml('x&#xA0;y&#x2009;z')).toBe('x y z');
    });

    test('decodes Hebrew numeric entities to characters', () => {
        expect(Sefaria.util.plainTextFromSegmentHtml('&#1488;')).toBe('\u05d0');
    });

    test('decodes &amp; for plain text', () => {
        expect(Sefaria.util.plainTextFromSegmentHtml('a &amp; b')).toBe('a & b');
    });

    test('decodes common typography named entities', () => {
        expect(Sefaria.util.plainTextFromSegmentHtml('&ldquo;Hi&rdquo;')).toBe('\u201cHi\u201d');
        expect(Sefaria.util.plainTextFromSegmentHtml('a&mdash;b&ndash;c')).toBe('a\u2014b\u2013c');
        expect(Sefaria.util.plainTextFromSegmentHtml('&hellip;')).toBe('\u2026');
    });

    test('decodes numeric punctuation and Latin-1', () => {
        expect(Sefaria.util.plainTextFromSegmentHtml('&#8212;')).toBe('\u2014');
        expect(Sefaria.util.plainTextFromSegmentHtml('&#233;')).toBe('\u00e9');
    });

    test('strips invisible bidi marks and zero-width space', () => {
        expect(Sefaria.util.plainTextFromSegmentHtml(`a\u200eb\u200fc`)).toBe('abc');
        expect(Sefaria.util.plainTextFromSegmentHtml('x\u200by')).toBe('xy');
        expect(Sefaria.util.plainTextFromSegmentHtml('\ufeffhello')).toBe('hello');
    });

    test('double-encoded &amp;quot; becomes a quote character', () => {
        expect(Sefaria.util.plainTextFromSegmentHtml('&amp;quot;x&amp;quot;')).toBe('"x"');
    });
});