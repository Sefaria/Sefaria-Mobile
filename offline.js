import { Platform } from 'react-native';
import md5 from 'md5';
import * as FileSystem from 'expo-file-system';
import { unzip } from 'react-native-zip-archive';
import LinkContent from './LinkContent';
import {ERRORS} from "./errors";
import {loadJSONFile} from "./DownloadControl";
import {
    fileExists
} from './DownloadControl'

/*
PUBLIC INTERFACE
 */

export const loadTextOffline = async function(ref, context, versions, fallbackOnDefaultVersions) {
    const sectionData = await loadOfflineSectionCompat(ref, versions, fallbackOnDefaultVersions);
    const processed = processFileData(ref, sectionData);
    if (context) {
        return processed;
    }
    return {result: textFromRefData(processed)};
};

export const loadTextTocOffline = function(title) {
    return _loadJSON(_JSONSourcePath(title + "_index"));
}

export const getOfflineVersionObjectsAvailable = function(ref) {
    /**
     * Returns known versions available for `ref` that are stored in index file of `ref`s index
     */
    const title = Sefaria.textTitleForRef(ref);
    const basicVersionObjects = Sefaria._versionsAvailableBySection[ref];
    if (!basicVersionObjects) { return; }
    const fullVersionObjects = basicVersionObjects.map(({versionTitle, language}) => {
        return Sefaria.getVersionObject(versionTitle, language, title);
    }).filter(versionObject => !!versionObject);
    return fullVersionObjects;
};

export const loadOfflineSectionMetadataCompat = async function(ref) {
    /**
     * v6 compatibility code
     */
    let metadata, fileNameStem;
    try {
        [metadata, fileNameStem] = await loadOfflineSectionMetadataWithCache(ref);
        return metadata;
    } catch(error) {
        if (error === ERRORS.OFFLINE_LIBRARY_NOT_COMPATIBLE_WITH_V7) {
            const compatData = await loadOfflineSectionV6(ref);
            return {links: compatData.content.map(segment => segment.links)};
        }
    }
};

export const openFileInSources = async function(filename) {
    const isIOS = Platform.OS === 'ios';
    let fileData;
    let useLib = false;
    const libPath = `${FileSystem.documentDirectory}/library/${filename}`;
    const sourcePath = isIOS ? encodeURI(`${FileSystem.bundleDirectory}/sources/${filename}`) : `${FileSystem.bundleDirectory}sources/${filename}`;
    const libExists = await fileExists(libPath);
    if (libExists) {
        // check date of each file and choose latest
        const libStats = await FileSystem.getInfoAsync(libPath);
        useLib = libStats.modificationTime * 1000 > Sefaria.lastAppUpdateTime;
    }
    if (useLib) {
        fileData = await _loadJSON(libPath);
    } else {
        fileData = await _loadJSON(sourcePath);
    }
    return fileData;
};

/*
PRIVATE INTERFACE
 */

const shouldLoadFromApi = function() {
    // there is currently one case where we load from API even if the index is downloaded
    // 1) debugNoLibrary is true
    return Sefaria.debugNoLibrary;
};

const getSectionFromJsonData = function(ref, data) {
    /**
     * works on either metadata files or objects returned from loadOfflineSection()
     */
    if (data.sections) {
        // If the data file represents multiple sections, pick the appropriate one to return
        const refUpOne = Sefaria.refUpOne(ref);

        // for malformed URLs that we can possibly correct
        const refWColon = Sefaria.refMissingColon(ref);
        const refWColonUpOne = Sefaria.refMissingColon(refUpOne);
        const possibleRefs = [ref, refUpOne, refWColon, refWColonUpOne];
        for (let tempRef of possibleRefs) {
            if (data.sections[tempRef]) {
                return data.sections[tempRef];
            }
        }
    }
    return data;
};

const populateMissingVersions = function(currVersions, allVersions) {
    // given currVersions and a list of versions sorted by priority,
    // make sure both "en" and "he" versions are populated, falling back on default
    currVersions = currVersions || {};
    for (let lang of ["en", "he"]) {
        if (currVersions[lang]) { continue; }
        const defaultVersion = getDefaultVersionForLang(allVersions, lang);
        if (!defaultVersion) { continue; }
        currVersions[lang] = defaultVersion.versionTitle;
    }
    return currVersions;
};

const getDefaultVersionForLang = function(allVersions, lang) {
    /**
     * default is first version with `lang`
     * assumption is versions are sorted in priority order, as returned by VersionSet()
     */
    return allVersions.find(v => v.language === lang);
};

const getOfflineSectionKey = function(ref, versions) {
    versions = versions || {};
    return `${ref}|${Object.entries(versions).join(',')}`;
};

const loadOfflineSectionCompat = async function(ref, versions, fallbackOnDefaultVersions=true) {
    /**
     * v6 compatibility code
     */
    try {
        return await loadOfflineSection(ref, versions, fallbackOnDefaultVersions);
    } catch(error) {
        if (error === ERRORS.OFFLINE_LIBRARY_NOT_COMPATIBLE_WITH_V7) {
            return await loadOfflineSectionV6(ref, versions);
        } else if (error === ERRORS.NOT_OFFLINE) {
            // rethrow to indicate we should try an API call
            throw error;
        }
    }
};

const loadOfflineSectionV6 = async function(ref, versions) {
    /**
     * v6 compatibility code
     */
    var fileNameStem = ref.split(":")[0];
    var bookRefStem  = Sefaria.textTitleForRef(ref);
    //if you want to open a specific version, there is no json file. force an api call instead
    const shouldLoadFromApi = shouldLoadFromApi(versions) || Sefaria.util.objectHasNonNullValues(versions);
    if (shouldLoadFromApi) { throw ERRORS.NOT_OFFLINE; }
    var jsonPath = _JSONSourcePath(fileNameStem);
    var zipPath  = _zipSourcePath(bookRefStem);
    // Pull data from in memory cache if available
    if (jsonPath in Sefaria._jsonData) {
        return Sefaria._jsonData[jsonPath];
    }

    const preResolve = jsonData => {
        const sectionData = getSectionFromJsonData(ref, jsonData);
        if (!(jsonPath in Sefaria._jsonData)) {
            Sefaria._jsonData[jsonPath] = sectionData;
        }
        return sectionData;
    };
    let data;
    try {
        data = await _loadJSON(jsonPath);
        return preResolve(data);
    } catch (e) {
        const exists = await fileExists(zipPath);
        if (exists) {
            const path = await _unzip(zipPath);
            try {
                data = await _loadJSON(jsonPath);
                return preResolve(data);
            } catch (e2) {
                // Now that the file is unzipped, if there was an error assume we have a depth 1 or 3 text
                var depth1FilenameStem = fileNameStem.substr(0, fileNameStem.lastIndexOf(" "));
                var depth1JSONPath = _JSONSourcePath(depth1FilenameStem);
                try {
                    data = await _loadJSON(depth1JSONPath);
                    return preResolve(data);
                } catch (e3) {
                    throw ERRORS.NOT_OFFLINE;
                }
            }
        } else {
            throw ERRORS.NOT_OFFLINE;
        }
    }
};

const loadOfflineSection = async function(ref, versions, fallbackOnDefaultVersions=true) {
    if (shouldLoadFromApi()) {
        throw ERRORS.NOT_OFFLINE;
    }

    const key = getOfflineSectionKey(ref, versions);
    const cached = Sefaria._jsonSectionData[key];
    if (cached) {
        return cached;
    }

    const [metadata, fileNameStem] = await loadOfflineSectionMetadataWithCache(ref);

    const textByLang = {};
    let defaultVersions = {};
    versions = populateMissingVersions(versions, metadata.versions);
    if (fallbackOnDefaultVersions) {
        defaultVersions = populateMissingVersions({}, metadata.versions);
        Sefaria.cacheCurrVersionsBySection(versions, ref);
    }
    for (let [lang, vtitle] of Object.entries(versions)) {
        const versionText = await loadOfflineSectionByVersionWithCacheAndFallback(fileNameStem, lang, vtitle, defaultVersions[lang]);
        // versionText may be depth-3. extract depth-2 if necessary.
        textByLang[lang] = getSectionFromJsonData(ref, versionText);
    }

    const fullSection = {...metadata};
    delete fullSection.links;
    fullSection.content = [];
    const sectionLen = Math.max(...Object.values(textByLang).map(x => x.length))
    for (let i = 0; i < sectionLen; i++) {
        fullSection.content.push({
            segmentNumber: i+1+"",
            links: metadata.links?.[i] || [],
            text: textByLang?.en?.[i] || "",
            he: textByLang?.he?.[i] || "",
        });
    }

    Sefaria._jsonSectionData[key] = fullSection;
    return fullSection;
};

const loadOfflineSectionByVersionWithCacheAndFallback = async function(fileNameStem, lang, vtitle, defaultVTitle) {
    /**
     * tries to load `vtitle`. If it fails, falls back on default and if that fails, throws an error that this version
     * isn't offline
     * if defaultVTitle is falsy, only try to load `vtitle` and if that fails throw error
     */
    try {
        return await loadOfflineSectionByVersionWithCache(fileNameStem, lang, vtitle);
    } catch(error) {
        if (!defaultVTitle) {
            throw ERRORS.NOT_OFFLINE;
        }
        try {
            return await loadOfflineSectionByVersionWithCache(fileNameStem, lang, defaultVTitle);
        } catch(error) {
            throw ERRORS.NOT_OFFLINE;
        }
    }
};

const loadOfflineSectionByVersionWithCache = async function(fileNameStem, lang, vtitle) {
    const key = `${fileNameStem}|${lang}|${vtitle}`;
    const cached = Sefaria._jsonSectionData[key];
    if (cached) { return cached; }
    const text = await loadOfflineSectionByVersion(fileNameStem, lang, vtitle);
    Sefaria._jsonSectionData[key] = text;
    return text;
};

const loadOfflineSectionByVersion = async function(fileNameStem, lang, vtitle) {
    /**
     * Assumption is zip file was already unzipped in loading of metadata
     * We also already know the fileNameStem from loading of metadata
     */
    const jsonPath = _JSONSectionPath(fileNameStem, vtitle, lang);
    return await _loadJSON(jsonPath);
};

const loadOfflineSectionMetadataWithCache = async function(ref) {
    const key = `${ref}|metadata`;
    const cached = Sefaria._jsonSectionData[key];
    if (cached) { return cached; }
    let metadata;
    try {
        metadata = await loadOfflineSectionMetadata(ref);
    } catch(error) {
        throw ERRORS.OFFLINE_LIBRARY_NOT_COMPATIBLE_WITH_V7;
    }
    Sefaria._jsonSectionData[key] = metadata;
    return metadata;
};

const loadOfflineSectionMetadata = async function(ref) {
    const fileNameStem = ref.split(":")[0];
    const bookRefStem  = Sefaria.textTitleForRef(ref);
    const jsonPath = _JSONMetadataPath(fileNameStem);
    const zipPath  = _zipSourcePath(bookRefStem);
    const preResolve = jsonData => {
        const sectionData = getSectionFromJsonData(ref, jsonData);
        if (!sectionData) { throw ERRORS.CANT_GET_SECTION_FROM_DATA; }
        return sectionData;
    };

    try {
        return [preResolve(await _loadJSON(jsonPath)), fileNameStem];
    } catch (e) {
        const exists = await fileExists(zipPath);
        if (exists) {
            await _unzip(zipPath);
            try {
                return [preResolve(await _loadJSON(jsonPath)), fileNameStem];
            } catch (e2) {
                // Now that the file is unzipped, if there was an error assume we have a depth 1 or 3 text
                const depth1FilenameStem = fileNameStem.substring(0, fileNameStem.lastIndexOf(" "));
                const depth1JSONPath = _JSONMetadataPath(depth1FilenameStem);
                try {
                    return [preResolve(await _loadJSON(depth1JSONPath)), depth1FilenameStem];
                } catch (e3) {
                    throw ERRORS.NOT_OFFLINE;
                }
            }
        } else {
            throw ERRORS.NOT_OFFLINE;
        }
    }
};

const textFromRefData = function(data) {
    // Returns a dictionary of the form {en: "", he: "", sectionRef: ""} that includes a single string with
    // Hebrew and English for `data.requestedRef` found in `data` as returned from loadText().
    // sectionRef is so that we know which file / api call to make to open this text
    // `data.requestedRef` may be either section or segment level or ranged ref.
    if (data.isSectionLevel) {
        let enText = "", heText = "";
        for (let i = 0; i < data.content.length; i++) {
            let item = data.content[i];
            if (typeof item.text === "string") enText += item.text + " ";
            if (typeof item.he === "string") heText += item.he + " ";
        }
        return new LinkContent(enText, heText, data.sectionRef);
    } else {
        let segmentNumber = data.requestedRef.slice(data.ref.length+1);
        let toSegmentNumber = -1;
        let dashIndex = segmentNumber.indexOf("-");
        if (dashIndex !== -1) {
            toSegmentNumber = parseInt(segmentNumber.slice(dashIndex+1));
            segmentNumber = parseInt(segmentNumber.slice(0, dashIndex));
        } else { segmentNumber = parseInt(segmentNumber); }
        let enText = "";
        let heText = "";
        for (let i = 0; i < data.content.length; i++) {
            let item = data.content[i];
            const currSegNum = parseInt(item.segmentNumber);
            if (currSegNum >= segmentNumber && (toSegmentNumber === -1 || currSegNum <= toSegmentNumber)) {
                if (typeof item.text === "string") enText += item.text + " ";
                if (typeof item.he === "string") heText += item.he + " ";
                if (toSegmentNumber === -1) {
                    break; //not a ranged ref
                }
            }
        }
        return new LinkContent(enText, heText, data.sectionRef);
    }
};

const _unzip = function(zipSourcePath) {
    return unzip(zipSourcePath, FileSystem.documentDirectory);
};

const _loadJSON = function(JSONSourcePath) {
    return loadJSONFile(JSONSourcePath)
};

const _JSONMetadataPath = function(sectionRef) {
    /**
     * Return the file path for a section file that contains the metadata for sectionRef
     */
    return _JSONSourcePath(`${sectionRef}.metadata`);
};

const _JSONSectionPath = function(sectionRef, vtitle, lang) {
    /**
     * Return the file path for a section file that contains data for a given section / vtitle / lang triplet
     */
    const vtitleHash = md5(vtitle).substring(0, 8);  // version title hash only uses the first 8 chars which is unique enough
    return _JSONSourcePath(`${sectionRef}.${vtitleHash}.${lang}`);
};

const _JSONSourcePath = function(fileName) {
    return (FileSystem.documentDirectory + "/" + fileName + ".json");
};

const _zipSourcePath = function(fileName) {
    return (FileSystem.documentDirectory + "/library/" + fileName + ".zip");
};

const processFileData = function(ref, data) {
    // Annotate link objects with useful fields not included in export
    data.content.forEach(segment => {
        if ("links" in segment) {
            segment.links.map(link => {
                link.textTitle = Sefaria.textTitleForRef(link.sourceRef);
                if (!("category" in link)) {
                    link.category = Sefaria.primaryCategoryForTitle(link.textTitle);
                }
            });
        }
    });
    data.requestedRef   = ref;
    data.isSectionLevel = (ref === data.sectionRef);
    Sefaria.cacheVersionsAvailableBySection(data.sectionRef, data.versions);
    return data;
};
