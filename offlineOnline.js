/**
 * File for functions that can either load data from offline library or API, depending on which one exists
 * Prefers offline library data
 */

import {ERRORS} from "./errors";
import {
    loadTextTocOffline,
    loadTextOffline,
    getOfflineVersionObjectsAvailable,
    loadOfflineSectionMetadataCompat
} from "./offline";
import api from "./api";


export const loadText = function(ref, context, versions, fallbackOnDefaultVersions=true) {
    /**
     if `context`, only return section no matter what. default is true
     versions is object with keys { en, he } specifying version titles of requested ref
     */
    if (typeof context === "undefined") { context = true; }
    return new Promise(function(resolve, reject) {
        loadTextOffline(ref, context, versions, fallbackOnDefaultVersions).then(resolve)
        .catch(error => {
            if (error === ERRORS.MISSING_OFFLINE_DATA) {
                api.textApi(ref, context, versions)
                .then(data => {
                    api.processTextApiData(ref, context, versions, data);
                    resolve(data);
                })
                .catch(error => reject(error))
            } else {
                console.error("Error loading offline file", error);
                reject(error);
            }
        })
    });
};

export const loadVersions = async (ref) => {
    let versionsApiError = false;
    let versions = getOfflineVersionObjectsAvailable(ref);
    if (!versions) {
        try {
            versions = await api.versions(ref, true);
        } catch(error) {
            versions = [];
            versionsApiError = true;
        }
    }
    return { versions, versionsApiError };
};

const relatedCacheKey = function(ref, online) {
    return `${ref}|${online}`;
};

export const loadRelated = async function(ref, online) {
    if (online) {
        return await api.related(ref);
    } else {
        const cacheKey = relatedCacheKey(ref, online);
        const cached = api._related[cacheKey];
        if (!!cached) { return cached; }
        // mimic response of links API so that addLinksToText() will work independent of data source
        const metadata = await loadOfflineSectionMetadataCompat(ref);
        if (!metadata) { throw ERRORS.CANT_GET_SECTION_FROM_DATA; }
        const linkList = (metadata.links.reduce((accum, segmentLinks, segNum) => accum.concat(
            !!segmentLinks ? segmentLinks.map(link => {
                const index_title = Sefaria.textTitleForRef(link.sourceRef);
                const collectiveTitle = Sefaria.collectiveTitlesDict[index_title];
                return {
                    sourceRef: link.sourceRef,
                    sourceHeRef: link.sourceHeRef,
                    index_title,
                    collectiveTitle,
                    category: ("category" in link) ? link.category : Sefaria.primaryCategoryForTitle(index_title),
                    anchorRef: `${ref}:${segNum+1}`,
                    sourceHasEn: link.sourceHasEn,
                }
            }) : []
        ), []));
        const offlineRelatedData = {links: linkList};
        api._related[cacheKey] = offlineRelatedData;
        return offlineRelatedData;
    }
};

const _textToc = {};

export const textToc = function(title) {
    return new Promise((resolve, reject) => {
        const resolver = function(data) {
            _textToc[title] = data;
            Sefaria.cacheVersionObjectByTitle(data.versions, title);
            resolve(data);
        };
        if (title in _textToc) {
            resolve(_textToc[title]);
        } else {
            loadTextTocOffline(title)
                .then(resolver)
                .catch(()=>{
                    api._request(title, 'index', true, {}).then(resolver)
                });
        }
    });
};
