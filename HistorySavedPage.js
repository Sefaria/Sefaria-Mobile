'use strict';

import React, {useContext, useEffect, useState, useCallback} from 'react';
import {
    Text,
    TouchableOpacity,
    View,
    FlatList,
    Image,
} from 'react-native';
import {
    PageHeader, StatefulHeader, FlexFrame, SimpleInterfaceBlock, ProfileListing, LoadingView,
} from './Misc.js';
import { DispatchContext, STATE_ACTIONS } from './StateManager';
import styles from './Styles';
import strings from './LocalizedStrings';
import {iconData} from './IconData';
import {useGetUserSettingsObj, useGlobalState, useRtlFlexDir} from './Hooks.js';
import Sefaria from './sefaria';
import {ColorBarBox, StoryBodyBlock, StoryFrame, StoryTitleBlock} from './Story';

const useSyncProfile = () => {
    const dispatch = useContext(DispatchContext);
    const getUserSettings = useGetUserSettingsObj();

    return useCallback(async () => {
        await Sefaria.history.syncProfile(dispatch, await getUserSettings());
    }, [dispatch, getUserSettings]);
};


export const HistorySavedPage = ({openRef, openMenu, hasInternet}) => {
    const syncProfile = useSyncProfile();
    const [synced, setSynced] = useState(false);
    const [mode, setMode] = useState('saved');


    useEffect(() => {
        (async () => { //using an async IAFE so the whole function doest become async
            // When this page loads, we make sure to sync with the application server to get latest history/saved synced.
            // If the sync fails we still use what we have locally and work off that.
            await syncProfile();
            setSynced(true);
        })();
    }, [syncProfile]);


    const changeMode = useCallback((newmode) => {
        setMode(prevMode => {
            if(newmode !== prevMode){
                return newmode;
            }
            return prevMode;
        });
    }, []);

    return(
        <View style={styles.menu}>
            {
                //If the main sync is still underway, we do still want the headers to show to the user, since it's ugly otherwise.
                // Once the rest renders the header will render as part of the FlatList below.
                !synced ? <HistorySavedPageHeader mode={mode} changeMode={changeMode} openMenu={openMenu} /> : null
            }
            <FlexFrame dir="column">
                {synced ?
                    <HistoryOrSavedList mode={mode} changeMode={changeMode} openRef={openRef} openMenu={openMenu} hasInternet={hasInternet}/>
                    :
                   <HistorySavedPageLoadingView />
                }
            </FlexFrame>
        </View>
    );
};


const HistorySavedPageLoadingView = () => {
    return(
        <LoadingView size="large" style={styles.historyLoadingView}/>
    );
};


const HistorySavedPageHeader = ({mode, changeMode, openMenu}) => {
    const {theme, isLoggedIn, hasDismissedSyncModal, readingHistory} = useGlobalState();
    const openLogin = () => openMenu('login', 'HistorySavedPage');
    const openSettings = () => openMenu('settings', 'HistorySavedPage');
    const changeToSaved = useCallback(() => changeMode('saved'), [changeMode]);
    const changeToHistory = useCallback(() => changeMode('history'), [changeMode]);
    return(
        <View>
            <View style={[styles.navRePage, styles.navReHistoryItem, theme.lighterGreyBorder]}>
                <PageHeader>
                    <FlexFrame justifyContent={'flex-start'}>
                        <StatefulHeader titleKey={'saved'} icon={'bookmark2'} active={mode === 'saved'} callbackFunc={changeToSaved}/>
                        <StatefulHeader titleKey={'history'} icon={'clock'} active={mode === 'history'} callbackFunc={changeToHistory}/>
                    </FlexFrame>
                </PageHeader>
            </View>
            {isLoggedIn || hasDismissedSyncModal ? null :
              <SyncPrompt openLogin={openLogin} />
            }
            {
              mode === 'history' && !readingHistory ? <ReadingHistoryPrompt openSettings={openSettings} /> : null
            }
        </View>
    );
};

const HistoryOrSavedList = ({mode, changeMode, openRef, openMenu, hasInternet}) => {
    const RenderClass = mode === 'history' ? HistoryList : SavedList;
    return (<RenderClass changeMode={changeMode} openRef={openRef} openMenu={openMenu} hasInternet={hasInternet}/>);
};

const SavedList = ({changeMode, openRef, openMenu, hasInternet}) => {
    return (<UserReadingList mode={'saved'} changeMode={changeMode} openRef={openRef} openMenu={openMenu} hasInternet={hasInternet}/>);
};

const HistoryList = ({changeMode, openRef, openMenu, hasInternet}) => {
    return (<UserReadingList mode={'history'} changeMode={changeMode} openRef={openRef} openMenu={openMenu} hasInternet={hasInternet}/>);
};

const UserReadingList = ({mode, changeMode, openRef, openMenu, hasInternet}) => {
    const syncProfile = useSyncProfile();
    const [localData, setLocalData] = useState([]);
    const [data, setData] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingState, setLoadingState] = useState({
        loadingAPIData: false,
        currSkipLoaded: 0,
        hasMoreData: true,
    });
    // Both loadingAPIData and loadingRef are needed.
    // loadingRef is synchronous which is good for blocking double load calls. loadingAPIData is a state var which can be used to render footer.
    const loadingRef = React.useRef(false);
    const SKIP_STEP = 20;

    const {theme, interfaceLanguage} = useGlobalState();

    /***
     * Removes duplicate or too similar history items and pathces sheet hist items
     * @param historyArray
     * @param onlyNormalize
     * @returns {*}
     */
    const dedupeAndNormalizeHistoryArray = useCallback((historyArray, onlyNormalize = false) => {
        return historyArray.reduce((accum, curr, index) => {
            //local history sheet items may not have the required data, so parse it out.
            if(curr?.is_sheet && !curr.hasOwnProperty('sheet_id')) { curr.sheet_id = getSheetIdFromRef(curr.ref); }
            if(curr.hasOwnProperty('he_ref')) { curr.heRef = curr.he_ref; }
            if(!curr.hasOwnProperty('book')) { curr.book = Sefaria.textTitleForRef(curr.ref); }
            //for saved items we don't want to dedupe at all
            if (!accum.length || onlyNormalize) {return accum.concat([curr]); }
            const prev = accum[accum.length-1];

            if (curr.is_sheet && curr.sheet_id === prev.sheet_id) {
                return accum;
            } else if (!curr.is_sheet && curr.book === prev.book) {
                return accum;
            } else {
                return accum.concat([curr]);
            }
        }, []);
    }, []);

    const reinitializeData = useCallback(() => {
        let rstore = Sefaria.history.getLocalHistoryArray(mode);
        let nstore = dedupeAndNormalizeHistoryArray(rstore, mode === 'saved');
        setLocalData([...nstore]);
        setData([]);
        setLoadingState({
            loadingAPIData: false,
            currSkipLoaded: 0,
            hasMoreData: true,
        });
        loadingRef.current = false;
    }, [mode, dedupeAndNormalizeHistoryArray]);

    const getAnnotatedItems = useCallback(async(refs, sheets) => {
        if(!hasInternet){
            return [{}, {}];
        }
        const p1 = Sefaria.api.getBulkText(refs, true);
        const p2 = Sefaria.api.getBulkSheets(sheets);
        try {
            return await Promise.all([p1, p2]);
        } catch (error) {
            console.error(error);
            return [{}, {}];
        }
    }, [hasInternet]);

    const getAnnotatedNextItems = useCallback(async (items) => {
        let refs = [];
        let sheets = [];
        for(let i of items){ //make lists of sheet ids and refs to fetch 'previews' for from api
            if(i?.is_sheet){
                sheets.push(i.sheet_id);
            }else{
                refs.push(i.ref);
            }
        }
        let [textsAnnotated, sheetsAnnotated] = await getAnnotatedItems(refs, sheets);
        // iterate over original items and put the extra data in
        //filter for errors here before mapping
        return items.reduce((result, element) => {
            if(element.hasOwnProperty('error')){
                return result;
            }
            const key = element.is_sheet ? 'sheet_id' : 'ref';
            const apiResponseObj = element.is_sheet ? sheetsAnnotated : textsAnnotated;
            if(apiResponseObj.hasOwnProperty(element[key])){
                element = {...element, ...apiResponseObj[element[key]]};
            }
            return [...result, element];
        }, []);
    }, [getAnnotatedItems]);

    const loadData = useCallback(() => {
        if (!loadingState.hasMoreData || loadingRef.current) {
            return;
        }

        loadingRef.current = true;
        let nitems = localData.slice(loadingState.currSkipLoaded, loadingState.currSkipLoaded + SKIP_STEP); //get the next 20 items from the raw local history
        if(!nitems.length) {
            setLoadingState(prev => ({...prev, hasMoreData: false}));
            loadingRef.current = false;
            return;
        }
        setLoadingState(prev => ({...prev, loadingAPIData: true}));
        getAnnotatedNextItems(nitems).then( nextItems => {
            setData(prevItems => {
                return [...prevItems, ...nextItems];
            });
            setLoadingState(prev => ({
                ...prev,
                hasMoreData: (prev.currSkipLoaded + SKIP_STEP) < localData.length,  // Use prev.currSkipLoaded instead of closure value
                currSkipLoaded: prev.currSkipLoaded + SKIP_STEP,
                loadingAPIData: false,
            }));
            loadingRef.current = false;
        });
    }, [loadingState.hasMoreData, localData, getAnnotatedNextItems, loadingState.currSkipLoaded]);

    useEffect(() => {
        //here we are getting a 'copy' of local history items that we will perform operations on.
        reinitializeData();
    }, [reinitializeData]);

    useEffect(()=> {
        // Load initial data when localData is set and we don't have any data yet
        if(localData.length > 0 && data.length === 0 && !loadingRef.current) {
            loadData();
        }
    }, [localData, data.length, loadData]);

    const onItemsEndReached = () => {
        if (!loadingState.hasMoreData || loadingRef.current || localData.length === 0) {
            return;
        }
        loadData();
    };

    const getSheetIdFromRef = (sref) => {
        let num = sref.match(/Sheet\s+(\d+)/);
        return parseInt(num?.[1]);
    };

    const renderEmpty = () => {
        const isHeb = interfaceLanguage === 'hebrew';
        return(
            <View style={{ paddingVertical: 20 }}>
                <Text style={[theme.secondaryText, isHeb ? styles.heInt : styles.enInt, styles.textCenter]}>{strings.noHistory}</Text>
            </View>
        );
    };

    const renderFooter = () => {
        if (!loadingState.loadingAPIData) {
            return null;
        }
        return (
            <HistorySavedPageLoadingView />
        );
    };

    const renderItem = ({item, index}) => {
        return (<HistoryItem item={item} key={index} openRef={openRef} />);
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await syncProfile();
        reinitializeData();
        setRefreshing(false);
    }, [syncProfile, reinitializeData]);

    return (
        <FlatList
            ListHeaderComponent={
                <HistorySavedPageHeader mode={mode} changeMode={changeMode} openMenu={openMenu} />
            }
            ListEmptyComponent={renderEmpty}
            data={data}
            keyExtractor={(item, index) => `${item.ref}-${index}`}
            renderItem={renderItem}
            onEndReached={onItemsEndReached}
            onEndReachedThreshold={0.3}
            ListFooterComponent={renderFooter}
            refreshing={refreshing}
            onRefresh={onRefresh}
        />
    );
};


const HistoryItem = ({item, openRef}) => {
    const {theme} = useGlobalState();
    const is_sheet = item.is_sheet;
    let { ref, versions } = item;
    const openHistoryItem = () => openRef(ref, null, versions);
    return(
        <TouchableOpacity onPress={openHistoryItem} delayPressIn={200}>
            <View style={[styles.navReHistoryItem, theme.lighterGreyBorder]}>
                {is_sheet ? <SheetHistoryItem sheet={item} /> : <TextHistoryItem text={item} />}
            </View>
        </TouchableOpacity>
    );
};

const TextHistoryItem = ({text}) => {
    return (
        <StoryFrame>
          <View style={styles.historyItemTitle}>
              <StoryTitleBlock en={text.ref} he={Sefaria.normHebrewRef(text.heRef)} /*onClick={() => openRef(text.ref)}*/ />
          </View>
          <ColorBarBox tref={text.ref}>
            <StoryBodyBlock en={text.en} he={text.he}/>
          </ColorBarBox>
        </StoryFrame>
      );
};

const SheetHistoryItem = ({sheet}) => {
    const { interfaceLanguage } = useGlobalState();
    const flexDirection = useRtlFlexDir(interfaceLanguage);
    const title = Sefaria.util.stripHtml(sheet.sheet_title);
    return (
    <StoryFrame>
        <StoryTitleBlock en={title} he={title} />
        {!!sheet.sheet_summary ? <SimpleInterfaceBlock en={sheet.sheet_summary} he={sheet.sheet_summary}/> : null}
        {!!sheet.publisher_name ? <View style={styles.historyPublisherName}>
          <ProfileListing
            image={sheet.publisher_image}
            name={sheet.publisher_name}
            organization={sheet.publisher_organization}
            flexDirection={flexDirection}
          /> 
        </View> : null }
    </StoryFrame>
    );
};


const SyncPrompt = ({ openLogin }) => {
  const dispatch = useContext(DispatchContext);
  return (
    <TouchableOpacity style={[styles.historyOpenLoginButton, styles.navReUpToEdge]}
      onPress={openLogin}
    >
      <Text style={[ styles.systemButtonText, styles.systemButtonTextBlue, styles.enInt]}>
        { `${strings.wantToSync} ` }
        <Text style={styles.underline}>{ strings.login }</Text>
      </Text>

      <TouchableOpacity onPress={() => {
          dispatch({
            type: STATE_ACTIONS.setHasDismissedSyncModal,
            value: true,
          });
        }}>
        <Image
          source={iconData.get('close', 'black')}
          resizeMode={'contain'}
          style={styles.historyPromptCloseIcon}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const ReadingHistoryPrompt = ({ openSettings }) => {
  const { theme, interfaceLanguage } = useGlobalState();
  const langStyle = interfaceLanguage === 'he' ? styles.heInt : styles.enInt;
  return (
    <View>
      <Text style={[langStyle, styles.navReUpToEdge, styles.readingHistoryPrompt, theme.secondaryText]}>
        {strings.readingHistoryIsCurrentlyDisabled + ' '}
        <Text style={[langStyle, theme.text]} onPress={openSettings}>
          {strings.settings.toLowerCase()}
        </Text>
        {'.'}
      </Text>
    </View>
  );
};
