'use strict';
import React, {useState, useEffect, useMemo, useCallback, useRef, useContext} from 'react';
import {GlobalStateContext, DispatchContext, STATE_ACTIONS, getTheme} from './StateManager';
import {Keyboard} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";


export const useAsyncVariable = (initIsLoaded, loadVariable, onLoad, initOnLoadValue) => {
    /*
    Loads a variable asynchronously and returns status of load
    Useful for determining when a variable from the Sefaria object is available, e.g. Sefaria.calendar
    onLoad - optional function to run on load. will be passed initOnLoadValue when initIsLoaded is true
    */
    const [isLoaded, setIsLoaded] = useState(initIsLoaded);
    const loadWrapper = useCallback(() => {
        if (!isLoaded) {
            return loadVariable();
        }
        return Promise.resolve(initOnLoadValue);
    }, [isLoaded, loadVariable]);

    const onLoadWrapper = useCallback((data) => {
        setIsLoaded(true);
        if (onLoad) {
            onLoad(data);
        }
    }, [onLoad]);
    useAsync(loadWrapper, onLoadWrapper);

    return isLoaded;
};

export const useAsync = (asyncFn, onSuccess) => {
    useEffect(() => {
        let isMounted = true;
        asyncFn().then(data => {
            if (isMounted) onSuccess(data);
        });
        return () => {
            isMounted = false
        };
    }, [asyncFn, onSuccess]);
};

export function usePaginatedLoad(fetchDataByPage, setter, identityElement, numPages, resetValue = false) {
    /*
    See `useIncrementalLoad` docs
    */

    const [page, setPage] = useState(0);
    const [isCanceled, setCanceled] = useState({});    // dict {idElem: Bool}
    const [valueQueue, setValueQueue] = useState(null);
    const [finishedLoading, setFinishedLoading] = useState(false);

    // When identityElement changes:
    // Set current identityElement to not canceled
    // Sets previous identityElement to canceled.
    //    Removes old items by calling setter(false);
    //    Resets page to 0
    useEffect(() => {
        setCanceled(d => {
            d[identityElement] = false;
            return Object.assign({}, d);
        });
        return () => {
            setCanceled(d => {
                d[identityElement] = true;
                return Object.assign({}, d);
            });
            setter(resetValue);
            setPage(0);
            setFinishedLoading(false);
        }
    }, [identityElement]);

    const fetchPage = useCallback(() => fetchDataByPage(page), [page, fetchDataByPage]);

    // make sure value setting callback and page procession get short circuited when id_elem has been canceled
    // clear value queue on success
    const setResult = useCallback((id_elem, val) => {
        if (isCanceled[id_elem]) {
            setValueQueue(null);
            setFinishedLoading(true);
            return;
        }
        setter(val);
        setValueQueue(null);
        if (page === numPages - 1 || numPages === 0) {
            setFinishedLoading(true);
            return;
        }
        setPage(prevPage => prevPage + 1);
    }, [isCanceled, setter, numPages, page, identityElement]);

    // Make sure that current value is processed with latest setResult function
    // if this is called from within the fetchPage effect, it will have stale canceled data
    useEffect(() => {
        if (valueQueue) {
            setResult(...valueQueue);
        }
    }, [valueQueue, setResult]);

    // Put value returned and originating identity element into value queue
    useEffect(() => {
        fetchPage()
            .then((val, err) => setValueQueue([identityElement, val])).catch(error => {
            if (error.error !== 'input not array') {
                throw error;
            }
        });
    }, [fetchPage]);

    return finishedLoading;
}

export function useIncrementalLoad(fetchData, input, pageSize, setter, identityElement, resetValue = false) {
    /*
    Loads all items in `input` in `pageSize` chunks.
    Each input chunk is passed to `fetchData`
    fetchData: (data) => Promise(). Takes subarray from `input` and returns promise.
    input: array of input data for `fetchData`
    pageSize: int, chunk size
    setter: (data) => null. Sets paginated data on component.  setter(false) clears data.
    identityElement: a string identifying a invocation of this effect.  When it changes, pagination and processing will restart.  Old calls in processes will be dropped on landing.
    resetValue: value to pass to `setter` to indicate that it should forget previous values and reset.
    */

    // When input changes, creates function to fetch data by page, computes number of pages
    const [fetchDataByPage, numPages] = useMemo(() => {
        const fetchDataByPage = (page) => {
            if (!input) {
                return Promise.reject({error: "input not array", input});
            }
            const pagedInput = input.slice(page * pageSize, (page + 1) * pageSize);
            return fetchData(pagedInput);
        };
        const numPages = Math.ceil(input.length / pageSize);
        return [fetchDataByPage, numPages];
    }, [input]);

    return usePaginatedLoad(fetchDataByPage, setter, identityElement, numPages, resetValue);
}

export function useGlobalState() {
    // exposes global state context along with menu_language and theme which are derived from state
    const state = useContext(GlobalStateContext);
    const {interfaceLanguage, textLanguage, themeStr} = state;
    const menuLanguage = Sefaria.util.get_menu_language(interfaceLanguage, textLanguage);
    const theme = getTheme(themeStr);

    return {
        ...state,
        menuLanguage,
        theme,
    };
}

export function useRtlFlexDir(lang, dir = 'row', reverse) {
    // return proper flexDirection depending on if lang is RTL or not
    // reverse is boolean
    // dir is either 'column' or 'row'
    const isRTL = lang === 'hebrew';
    const langReverse = isRTL ^ reverse;  // rare situation where XOR makes sense
    return `${dir}${langReverse ? '-reverse' : ''}`;
}

export function useRenderersProps(onPressATag) {
    /**
     * Used for the `renderersProps` prop of `RenderHTML`. Currently only supports setting a-tag onPress.
     * @param {*} onPressATag function to run when pressing a-tag
     * @returns
     */
    return useMemo(() => {
        return {
            a: {
                onPress: (event, url) => {
                    onPressATag(url);
                }
            }
        };
    }, [onPressATag]);
};

export const useGetUserSettingsObj = () => {
    const {emailFrequency, interfaceLanguage, preferredCustom, readingHistory} = useGlobalState();
    return async () => { // returns a funtion because thats the only way to get it to work, so the caller of this hook needs to await the functions resolving. 
        let time_stamp = parseInt(await AsyncStorage.getItem('lastSettingsUpdateTime'));
        if (!time_stamp) {
            time_stamp = 0;
        }
        return ({
            email_notifications: emailFrequency,
            interface_language: interfaceLanguage,
            textual_custom: preferredCustom,
            reading_history: readingHistory,
            time_stamp,
        });
    }
}

export const useIsKeyboardVisible = () => {
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => {
                setKeyboardVisible(true); // or some other action
            }
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                setKeyboardVisible(false); // or some other action
            }
        );

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, []);

    return isKeyboardVisible;
}
