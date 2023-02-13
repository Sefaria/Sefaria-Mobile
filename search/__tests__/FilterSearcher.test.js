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

const getFilterTree = () => {
    return [
        {
            title: "Tanakh", heTitle: "תנ״ך", selected: 2, children: [
                {title: "Genesis", heTitle: "בראשית", selected: 1},
                {title: "Job", heTitle: "איוב", selected: 0},
            ],
        },
        {
            title: "Tanakh Commentary", heTitle: "מפרשי תנ״ך", selected: 1, children: [
                {title: "Rashi on Job", heTitle: "רש״י על איוב", selected: 1},
            ],
        },
        {
            title: "Talmud Commentary", heTitle: "מפרשי תלמוד", selected: 0, children: [
                {title: "Rashi on Berakhot", heTitle: "רש״י על ברכות", selected: 0},
            ],
        },
    ].map(rawFilter => new FilterNode(rawFilter));
};

const getFilterByEnTitle = (filterTree, enTitle) => {
    for (let filter of filterTree) {
        if (filter.title === enTitle) {
            return filter;
        }
        const filterChild = getFilterByEnTitle(filter.children || [], enTitle);
        if (filterChild) { return filterChild; }
    }
};

describe('search filters', () => {
    const filterTree = getFilterTree();
    const getf = getFilterByEnTitle.bind(null, filterTree);
    const queries = [
        {query: "Blah", toMatchFilter: getf("Genesis")},
        {query: "איוב", toMatchFilter: getf("Job")},
        {query: "איו", toMatchFilter: getf("Rashi on Job")},
        {query: "רשי", toMatchFilter: getf("Rashi on Job")},
        {query: "dfad", toMatchFilter: getf("Tanakh")},
        {query: "dfad", toNotMatchFilter: getf("Talmud Commentary")},
    ];
    test.each(queries)('queryMatchesFilter', ({ query, toMatchFilter, toNotMatchFilter }) => {
        query = FS._normalizeQuery(query);
        const testResult = FS._queryMatchesFilter(query, toMatchFilter || toNotMatchFilter);
        const expectedResult = !!toMatchFilter;
        expect(testResult).toBe(expectedResult);
    });
    test.each(queries)('_hasWordStartingWithOrSelected', ({ query, toMatchFilter, toNotMatchFilter }) => {
        const testResult = FS._hasWordStartingWithOrSelected(toMatchFilter || toNotMatchFilter, query);
        const expectedResult = !!toMatchFilter;
        expect(testResult).toBe(expectedResult);
    })

})