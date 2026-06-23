/**
 * File for functions that can either load data from offline library or API, depending on which one exists
 * Prefers offline library data
 */

import {ERRORS} from "./errors";
import {
    loadTextIndexOffline,
    loadTextOffline,
    loadLinksOffline,
    getOfflineVersionObjectsAvailable,
    getAllTranslationsOffline,
    textFromRefData,
} from "./offline";
import api from "./api";


export const loadText = function(ref, context, versions, fallbackOnDefaultVersions=true, failSilently=false) {
    /**
     if `context`, only return section no matter what. default is true
     versions is object with keys { en, he } specifying version titles of requested ref
     Returns a promise that resolves to an object with either:
        {textContent, links: array} if context is truthy
        {result: LinkContent} if context is falsy
     */
    if (typeof context === "undefined") { context = true; }
    console.log('[OFFLINE-DEBUG] loadText called', JSON.stringify({ ref, context, versions, fallbackOnDefaultVersions, failSilently }));
    return loadTextOffline(ref, versions, fallbackOnDefaultVersions)
        .then(({textContent, links}) => {
            if (textContent?.missingLangs?.length) {
                console.log('[OFFLINE-DEBUG] FALLTHROUGH reason=missingLangs', JSON.stringify({ ref, missingLangs: textContent.missingLangs, requestedVersions: versions, fallbackOnDefaultVersions }));
                throw ERRORS.MISSING_OFFLINE_DATA;
            }
            console.log('[OFFLINE-DEBUG] SUCCESS served from offline library', JSON.stringify({ ref }));
            if (!context) {
                const result = textFromRefData(textContent);
                return {result};
            }

            return {textContent, links};
        })
        .catch(error => {
            if (error === ERRORS.MISSING_OFFLINE_DATA) {
                console.log('[OFFLINE-DEBUG] calling API (MISSING_OFFLINE_DATA) -> network request', JSON.stringify({ ref, failSilently }));
                return api.textApi(ref, context, versions, failSilently)
                    .then(data => {
                        api.processTextApiData(ref, context, versions, data);
                        return data;
                    })
            }
            console.error("[OFFLINE-DEBUG] Error loading offline file (non-MISSING_OFFLINE_DATA, will reject)", error, "ref:", ref);
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

export const loadTranslations = async (ref, online=true) => {
    const offlineTranslations = await getAllTranslationsOffline(ref);
    let translations = offlineTranslations?.translations || [];
    // Translations are secondary/optional data. Only hit the API when online, and fail
    // silently so a missing (un-downloaded) version never pops a blocking no-internet alert.
    if (online && (!offlineTranslations || offlineTranslations.missingVersions.length)) {
        translations = await api.translations(ref, true);
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
            loadTextIndexOffline(title)
                .then(resolver)
                .catch(()=>{
                    api._request(title, 'index', true, {}).then(resolver)
                });
        }
    });
};
