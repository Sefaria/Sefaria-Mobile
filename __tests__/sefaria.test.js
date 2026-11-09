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