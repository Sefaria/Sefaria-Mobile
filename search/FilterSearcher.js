import Sefaria from "../sefaria";

export class FilterSearcher {
    constructor(filters) {
        this.filters = filters;
    }
    static _normalizeQuery = query => Sefaria.util.regexEscape(query).replace(/[^\w\s\-\u05d0-\u05ea]/g, "");
    static _getRegex = query => new RegExp(`(?:^|.+\\s)${query}.*`, "i");
    static _queryMatchesText = (query, text) => this._getRegex(query).test(text);
    static _queryMatchesFilter = (query, filter) => (
        !!filter.selected ||
        this._queryMatchesText(query, filter.title) ||
        this._queryMatchesText(query, filter.heTitle)
    );

    static _hasWordStartingWithOrSelected = (filter, query) => {
        query = this._normalizeQuery(query);
        return this._hasWordStartingWithOrSelectedRecursive(filter, query);
    };

    static _hasWordStartingWithOrSelectedRecursive = (filter, escapedQuery) => {
        if (this._queryMatchesFilter(escapedQuery, filter)) {
            return true;
        } else {
            return filter.children.filter(x => this._hasWordStartingWithOrSelectedRecursive(x, escapedQuery)).length > 0;
        }
    };

    static wordSelected = (filter) => filter.selected ? -1 : 1;

    search = (query, sorted) => {
        const hasQuery = query && query !== "";
        const matchingFilters = this.filters.filter(x => hasQuery ? FilterSearcher._hasWordStartingWithOrSelected(x, query) : true);
        if (sorted) {
            matchingFilters.sort(FilterSearcher.wordSelected);
        }
        return matchingFilters;
    };
}
