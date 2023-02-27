'use strict';

import PropTypes, {element} from 'prop-types';

import React, {useContext, useEffect, useState} from 'react';
import {
    Text,
    TouchableOpacity,
    View,
    FlatList,
    ActivityIndicator, Image
} from 'react-native';
import {
    CategoryColorLine,
    CategorySideColorLink,
    DirectedButton,
    LanguageToggleButton,
    AnimatedRow,
    PageHeader, StatefulHeader, FlexFrame, SimpleInterfaceBlock, ProfileListing,
} from './Misc.js';
import { DispatchContext, STATE_ACTIONS } from './StateManager';
import styles from './Styles';
import strings from './LocalizedStrings';
import {iconData} from "./IconData";
import {useGetUserSettingsObj, useGlobalState, useRtlFlexDir} from './Hooks.js';
import Sefaria from './sefaria';
import SwipeableFlatList from "./SwipeableFlatList";
import {ColorBarBox, StoryBodyBlock, StoryFrame, StoryTitleBlock} from "./Story";


export const HistorySavedPage = ({openRef, openMenu, hasInternet}) => {
    const dispatch = useContext(DispatchContext);  
    const getUserSettings = useGetUserSettingsObj();
    const [synced, setSynced] = useState(false);
    const [mode, setMode] = useState("saved");
    
    
    useEffect(() => {
        (async () => { //using an async IAFE so the whole function doest become async
            await Sefaria.history.syncProfile(dispatch, await getUserSettings());
            setSynced(true);
        })();
    }, []);
    
    
    const changeMode = (newmode) => {
        if(newmode != mode){
            setMode(newmode);  
        }
    };
    
    return(
        <View style={[styles.navRePage, {flex: 1, alignSelf: "stretch"}]}>
            <FlexFrame dir={"column"}>
                {synced ? <HistoryOrSavedList mode={mode} changeMode={changeMode} openRef={openRef} openMenu={openMenu} hasInternet={hasInternet}/> : <ActivityIndicator size="large" />  }
            </FlexFrame>
        </View>
    );
};

const HistoryOrSavedList = ({mode, changeMode, openRef, openMenu, hasInternet}) => {
    const RenderClass = mode === "history" ? HistoryList : SavedList;  
    return (<RenderClass changeMode={changeMode} openRef={openRef} openMenu={openMenu} hasInternet={hasInternet}/>);
};

const SavedList = ({changeMode, openRef, openMenu, hasInternet}) => {
    return (<UserReadingList mode={"saved"} changeMode={changeMode} openRef={openRef} openMenu={openMenu} hasInternet={hasInternet}/>);
};

const HistoryList = ({changeMode, openRef, openMenu, hasInternet}) => {
    return (<UserReadingList mode={"history"} changeMode={changeMode} openRef={openRef} openMenu={openMenu} hasInternet={hasInternet}/>);
};

const UserReadingList = ({mode, changeMode, openRef, openMenu, hasInternet}) => {
    const [localData, setLocalData] = useState([]);
    const [data, setData] = useState([]);
    const [loadingAPIData, setLoadingAPIData] = useState(false);
    const [skip, setSkip] = useState(0);
    const [hasMoreData, setHasMoreData] = useState(true);
    const SKIP_STEP = 20;
    
    const {theme, isLoggedIn, hasDismissedSyncModal, readingHistory, interfaceLanguage} = useGlobalState();
    const openLogin = () => openMenu("login", "HistorySavedPage");
    const openSettings = () => openMenu("settings", "HistorySavedPage");
    const fireModeChange = (mode) => {
        console.log(mode);
        changeMode(mode);
    } 
    
    useEffect(() => {
        //here we are getting a "copy" of local history items that we will perform operations on. 
        let rstore = Sefaria.history.getLocalHistoryArray(mode);
        let nstore = dedupeAndNormalizeHistoryArray(rstore, mode == "saved");
        console.log("store:" ,nstore);
        setLocalData([...nstore]);
    }, []);
    
    useEffect(()=> {
        if(!localData.length) { return;}
        loadData();
    }, [localData /*, mode*/]);
    
    useEffect(() => {
        if(!localData.length || skip === 0) {return;}
        loadData();
    }, [skip]);
    
    
    const onItemsEndReached = () => {
        console.log("end items reached")
        setSkip(skip + SKIP_STEP);
        //loadData();
    };
    
    const loadData = () => {
        if (!hasMoreData) {
          return;
        }
        
        let nitems = localData.slice(skip, skip + SKIP_STEP); //get the next 20 items from the raw local history
        if(!nitems.length) { setHasMoreData(false); return;}
        setLoadingAPIData(true);
        getAnnotatedNextItems(nitems).then( nextItems => {
            setData(prevItems => {
                console.log([...prevItems, ...nextItems]);
                return [...prevItems, ...nextItems];
            });
            if (skip + SKIP_STEP >= localData.length) {
                setHasMoreData(false);
            }
            setLoadingAPIData(false);
        });
    };
    
    
    const getAnnotatedNextItems = async (items) => {
        let refs = [];
        let sheets = [];
        for(let i of items){ //make lists of sheet ids and refs to fetch "previews" for from api
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
            if(element.hasOwnProperty("error")){
                return result;
            }
            const key = element.is_sheet ? "sheet_id" : "ref";
            const apiResponseObj = element.is_sheet ? sheetsAnnotated : textsAnnotated;
            if(!apiResponseObj.hasOwnProperty(element[key])){
                return result;
            }
            const mergedElement = {...element, ...apiResponseObj[element[key]]};
            return [...result, mergedElement];
            //return hisElement?.is_sheet ? {...hisElement, ...sheetsAnnotated[hisElement.sheet_id]} : {...hisElement, ...textsAnnotated[hisElement.ref]};
        }, []);
    };
    
    const getAnnotatedItems = async(refs, sheets) => {
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
    };
    
    const getSheetIdFromRef = (sref) => {
        let num = sref.match(/Sheet\s+(\d+)/);
        return parseInt(num?.[1]);
    };
    
    /***
     * Removes duplicate or too similar history items and pathces sheet hist items
      * @param historyArray
     * @param onlyNormalize
     * @returns {*}
     */ 
    const dedupeAndNormalizeHistoryArray = (historyArray, onlyNormalize = false) => {
        return historyArray.reduce((accum, curr, index) => {
            //local history sheet items may not have the required data, so parse it out. 
            if(curr?.is_sheet && !curr.hasOwnProperty("sheet_id")) { curr.sheet_id = getSheetIdFromRef(curr['ref']); }
            if(curr.hasOwnProperty("he_ref")) { curr.heRef = curr.he_ref };
            if(!curr.hasOwnProperty("book")) { curr.book = Sefaria.textTitleForRef(curr.ref) }; 
            //for saved items we dont want to dedupe at all
            if (!accum.length || onlyNormalize) {return accum.concat([curr]); }
            const prev = accum[accum.length-1];
            
            if (curr.is_sheet && curr.sheet_id === prev.sheet_id) {
              return accum;
            } else if (!curr.is_sheet && curr.book === prev.book) {
              return accum;
            } else {
              return accum.concat([curr]);
            }
          }, [])
    };
    
    const renderEmpty = () => {
        const isHeb = interfaceLanguage === "hebrew";
        return(
            <View style={{ paddingVertical: 20 }}>
                <Text style={[theme.secondaryText, isHeb ? styles.heInt : styles.enInt, {textAlign: "center"}]}>{strings.noHistory}</Text>
            </View>
        );
    }
    
    const renderFooter = () => {
        if (!loadingAPIData) {
            return null;
        }
        return (
          <View style={{ paddingVertical: 20 }}>
            <ActivityIndicator size="large" />
          </View>
        );
    };
    
    const renderHeader = () => {
        return(
            <View>
                <View style={[styles.navReHistoryItem, theme.lighterGreyBorder]}>
                    <PageHeader>
                        <FlexFrame justifyContent={"flex-start"}>
                            <StatefulHeader titleKey={"saved"} icon={"bookmark2"} active={mode === "saved"} callbackFunc={()=>fireModeChange("saved")}/>
                            <StatefulHeader titleKey={"history"} icon={"clock"} active={mode === "history"} callbackFunc={()=>fireModeChange("history")}/>
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
    
    const renderItem = ({item, index}) => {
        return (<HistoryItem item={item} key={index} />);
    };
    
    return (
        <FlatList
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={renderEmpty}
            data={data}
            keyExtractor={(item, index) => `${item.ref}-${index}`}
            renderItem={renderItem}
            onEndReached={onItemsEndReached}
            onEndReachedThreshold={0.3}
            ListFooterComponent={renderFooter}
        />
    );
};




const HistoryItem = ({item}) => {
    const {theme} = useGlobalState();
    const is_sheet = item.is_sheet;
    return(
        <View style={[styles.navReHistoryItem, theme.lighterGreyBorder]}>
            {is_sheet ? <SheetHistoryItem sheet={item} /> : <TextHistoryItem text={item} />}
        </View>  
    );
}

const TextHistoryItem = ({text}) => {
    const { textLanguage } = useGlobalState();
    return (
        <StoryFrame extraStyles={styles.topicItemMargins}>
          <View style={{marginBottom: 10}}>
              <StoryTitleBlock en={text.ref} he={Sefaria.normHebrewRef(text.heRef)} /*onClick={() => openRef(text.ref)}*/ />
          </View>
          <ColorBarBox tref={text.ref}>
            <StoryBodyBlock en={text.en} he={text.he}/>
          </ColorBarBox>
        </StoryFrame>
      );
}; 

const SheetHistoryItem = ({sheet}) => {
    const { theme, interfaceLanguage, textLanguage } = useGlobalState();
    const flexDirection = useRtlFlexDir(interfaceLanguage);
    const isHeb = interfaceLanguage === 'hebrew';
    const title = Sefaria.util.stripHtml(sheet.sheet_title);
    return (
    <StoryFrame extraStyles={[styles.topicItemMargins]}>
        <StoryTitleBlock en={title} he={title} /*onClick={}*/ />
        {sheet.sheet_summary ? <SimpleInterfaceBlock en={sheet.sheet_summary} he={sheet.sheet_summary}/> : null}
        <View style={{marginTop: 10}}>
          <ProfileListing
            image={sheet.publisher_image}
            name={sheet.publisher_name}
            organization={sheet.publisher_organization}
            flexDirection={flexDirection}
          />
        </View>
    </StoryFrame>
    );
}; 


const SyncPrompt = ({ openLogin }) => {
  const dispatch = useContext(DispatchContext);
  return (
    <TouchableOpacity style={{
        backgroundColor: "#18345D",
        paddingVertical: 20,
        paddingHorizontal: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
      onPress={openLogin}
    >
      <Text style={[ styles.systemButtonText, styles.systemButtonTextBlue, styles.enInt]}>
        { `${strings.wantToSync} ` }
        <Text style={[{ textDecorationLine: 'underline'}]}>{ strings.login }</Text>
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
          style={{width: 14, height: 14}}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const ReadingHistoryPrompt = ({ openSettings }) => {
  const { theme, interfaceLanguage } = useGlobalState();
  const langStyle = interfaceLanguage === 'he' ? styles.heInt : styles.enInt;
  return (
    <View>
      <Text style={[langStyle, {textAlign: "center", marginTop: 20, paddingHorizontal: 15}, theme.secondaryText]}>
        {strings.readingHistoryIsCurrentlyDisabled + " "}
        <Text style={[langStyle, theme.text]} onPress={openSettings}>
          {strings.settings.toLowerCase()}
        </Text>
        {'.'}
      </Text>
    </View>
  );
}