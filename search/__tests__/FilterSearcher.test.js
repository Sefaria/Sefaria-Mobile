import {FilterSearcher} from "../FilterSearcher";
import {FilterNode} from "@sefaria/search";
import Sefaria from "../../sefaria";

describe('normalizeQuery', () => {
    /**
     * tests that query matches itself after escaping
     */
    const queries = [
        {orig: "a-b", normal: "a-b"},
        {orig: "א-ב", normal: "א-ב"},
        {orig: "!@!*$))_+_'.a2$%@", normal: "__a2"},
    ];
    test.each(queries)('escapeQuery', ({ orig:query }) => {
        const escapedQuery = new RegExp(Sefaria.util.regexEscape(query));
        const actualMatch = query.match(escapedQuery);
        expect(actualMatch.length).toBe(1);
        expect(actualMatch[0]).toBe(query);
    });
    test.each(queries)('normalizeQuery', ({ orig, normal }) => {
        const actualNormal = FilterSearcher._normalizeQuery(orig);
        expect(actualNormal).toBe(normal);
    });
});