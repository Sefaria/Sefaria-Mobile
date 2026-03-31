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

    test('leaves non-spacing numeric entities unchanged', () => {
        expect(Sefaria.util.plainTextFromSegmentHtml('&#1488;')).toBe('&#1488;');
    });

    test('decodes &amp; for plain text', () => {
        expect(Sefaria.util.plainTextFromSegmentHtml('a &amp; b')).toBe('a & b');
    });
});