/**
 * File for functions that can either load data from offline library or API, depending on which one exists
 * Prefers offline library data
 */

import {ERRORS} from "./errors";
import {
    loadTextTocOffline,
    loadTextOffline,
    loadLinksOffline,
    getOfflineVersionObjectsAvailable,
    loadOfflineSectionMetadataCompat, getAllTranslationsOffline
} from "./offline";
import api from "./api";


export const loadText = function(ref, context, versions, fallbackOnDefaultVersions=true) {
    /**
     if `context`, only return section no matter what. default is true
     versions is object with keys { en, he } specifying version titles of requested ref
     */
    if (typeof context === "undefined") { context = true; }
    return loadTextOffline(ref, context, versions, fallbackOnDefaultVersions)
        .then((result) => {
            if (result && !result?.missingLangs?.length) {
                return result;
            } else if (result?.missingLangs?.length) {
                throw ERRORS.MISSING_OFFLINE_DATA;
            }
        })
        .catch(error => {
            if (error === ERRORS.MISSING_OFFLINE_DATA) {
                return api.textApi(ref, context, versions)
                    .then(data => {
                        api.processTextApiData(ref, context, versions, data);
                        return data;
                    })
            }
            console.error("Error loading offline file", error);
            return Promise.reject(error);
        })
        .catch((error) => {
            return Promise.reject(error);
        })
};

export const loadVersions = async (ref) => {
    let versions = getOfflineVersionObjectsAvailable(ref);
    if (!versions) {
        versions = await api.versions(ref, true);
    }
    return versions;
};

export const loadTranslations = async (ref) => {
    const offlineTranslations = await getAllTranslationsOffline(ref);
    let translations = offlineTranslations?.translations || [];
    if (!offlineTranslations || offlineTranslations.missingVersions.length) {
        translations = await api.translations(ref);
    }
    return translations;
}

export const loadRelated = async function(ref, online) {
    const cached = api._related[ref];
    if (!!cached) { return cached; }
    const loader = online ? api.related : loadLinksOffline;
    const response = await loader(ref);
    api._related[ref] = response;
    return response;
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
