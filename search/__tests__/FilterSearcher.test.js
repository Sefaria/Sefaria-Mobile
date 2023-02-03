import {FilterSearcher as FS} from "../FilterSearcher";
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
        const actualNormal = FS._normalizeQuery(orig);
        expect(actualNormal).toBe(normal);
    });
});

describe('getRegex', () => {
    const queries = [
        {query: "Yoma", toMatch: "Yoma"},
        {query: "yoma", toMatch: "Yoma"},
        {query: "yoma", toMatch: "Mishnah Yoma"},
        {query: "yoma!", toMatch: "Mishnah Yoma"},
        {query: "yoma-", toNotMatch: "Mishnah Yoma"},
        {query: "yom", toMatch: "Mishnah Yoma"},
        {query: "יומא", toMatch: "משנה יומא"},
    ];
    test.each(queries)('getRegex', ({ query, toMatch, toNotMatch }) => {
        query = FS._normalizeQuery(query);
        const regex = FS._getRegex(query);
        const expectedResult = !!toMatch;
        expect(regex.test(toMatch || toNotMatch)).toBe(expectedResult);
    });
    test.each(queries)('queryMatchesText', ({ query, toMatch, toNotMatch }) => {
        query = FS._normalizeQuery(query);
        const testResult = FS._queryMatchesText(query, toMatch || toNotMatch);
        const expectedResult = !!toMatch;
        expect(testResult).toBe(expectedResult);
    });
});