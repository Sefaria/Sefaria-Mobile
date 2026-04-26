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
            ['strips_tags_and_decodes_named_spacing_entities', '<span>foo&nbsp;bar&thinsp;baz</span>', `foo\u00a0bar\u2009baz`],
            ['preserves_unicode_nbsp_and_thin_space', `a\u00a0b\u2009c`, `a\u00a0b\u2009c`],
            ['decodes_numeric_spacing_entities_decimal', 'x&#160;y&#8201;z', `x\u00a0y\u2009z`],
            ['decodes_numeric_spacing_entities_hex', 'x&#xA0;y&#x2009;z', `x\u00a0y\u2009z`],
            ['decodes_hebrew_numeric_entity', '&#1488;', '\u05d0'],
            ['decodes_amp_for_plain_text', 'a &amp; b', 'a & b'],
            ['decodes_typography_left_right_quotes', '&ldquo;Hi&rdquo;', '\u201cHi\u201d'],
            ['decodes_typography_em_dash_en_dash', 'a&mdash;b&ndash;c', 'a\u2014b\u2013c'],
            ['decodes_typography_ellipsis', '&hellip;', '\u2026'],
            ['decodes_numeric_punctuation', '&#8212;', '\u2014'],
            ['decodes_numeric_latin1', '&#233;', '\u00e9'],
            ['preserves_invisible_bidi_marks', `a\u200eb\u200fc`, `a\u200eb\u200fc`],
            ['preserves_zero_width_characters', 'x\u200by', 'x\u200by'],
            ['preserves_bom_character', '\ufeffhello', '\ufeffhello'],
            ['double_encoded_amp_quot_decodes_once', '&amp;quot;x&amp;quot;', '&quot;x&quot;'],
            ['preserves_literal_less_than_characters', '1 < 2 and 3 < 4', '1 < 2 and 3 < 4'],
            ['handles_gt_inside_quoted_tag_attributes', '<a title="1 > 0">keep</a> text', 'keep text'],
        ];
        for (const [name, input, expected] of cases) {
            expect(Sefaria.util.htmlToTextCanonical(input)).toBe(expected);
        }
    });
});