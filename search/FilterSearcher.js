import Sefaria from "../sefaria";
import {FilterNode} from "@sefaria/search";

export class FilterSearcher {
    constructor(filterTree) {
        this.filterTree = filterTree;
    }
    static _normalizeQuery = query => Sefaria.util.regexEscape(query).replace(/[^\w\s\-\u05d0-\u05ea]/g, "");
    static _getRegex = query => new RegExp(`(?:^|.+\\s)${query}.*`, "i");
    static _queryMatchesText = (query, text) => this._getRegex(query).test(text);
    static _queryMatchesFilter = (query, filter) => (
        !!filter.selected ||
        this._queryMatchesText(query, filter.title) ||
        this._queryMatchesText(query, filter.heTitle)
    );

    static _getFilterTreeByQuery = (filterTree, query) => {
        query = this._normalizeQuery(query);
        return this._getFilterTreeByQueryRecursive(filterTree, query);
    };

    static _getFilterTreeByQueryRecursive  = (filterTree, escapedQuery) => {
        return filterTree.map(filter => {
            if (!this._queryMatchesFilter(escapedQuery, filter)) {
                const newChildren = this._getFilterTreeByQueryRecursive(filter.children, escapedQuery);
                if (newChildren.length === 0) {
                    return null;
                }
                const newFilter = new FilterNode({...filter});
                newFilter.children = newChildren;
                return newFilter;
            }
            return filter;
        }).filter(filter => !!filter);
    }

    static wordSelected = (filter) => filter.selected ? -1 : 1;

    /**
     * Return tree of filters where each filter either matches the query or has a child which matches the query
     * @param query: String query. Filters will match if (a) they are selected (b) their English title matches (c) their Hebrew title matches
     * @param sorted: true if root filters should be returned sorted alphabetically
     * @returns {*} filter tree
     */
    getMatchingFilterTree = (query, sorted) => {
        const hasQuery = query && query !== "";
        const matchingFilters = hasQuery ? FilterSearcher._getFilterTreeByQuery(this.filterTree, query) : this.filterTree;
        if (sorted) {
            matchingFilters.sort(FilterSearcher.wordSelected);
        }
        return matchingFilters;
    };
}
