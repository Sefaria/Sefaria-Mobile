'use strict';

import PropTypes from 'prop-types';

import React, {useContext, useEffect, useState} from 'react';
import {
    Text,
    TouchableOpacity,
    View,
    FlatList, 
    ActivityIndicator
} from 'react-native';
import {
    CategoryColorLine,
    CategorySideColorLink,
    DirectedButton,
    LanguageToggleButton,
    AnimatedRow,
    PageHeader, StatefulHeader, FlexFrame,
} from './Misc.js';
import { DispatchContext, STATE_ACTIONS } from './StateManager';
import styles from './Styles';
import strings from './LocalizedStrings';
import {iconData} from "./IconData";
import {useGetUserSettingsObj, useGlobalState} from './Hooks.js';
import Sefaria from './sefaria';


export const HistorySavedPage = ({}) => {
    const dispatch = useContext(DispatchContext);  
    const getUserSettings = useGetUserSettingsObj();
    const [synced, setSynced] = useState(false);
    const [store, setStore] = useState([]);
    const [mode, setMode] = useState("saved");
    
    const [data, setData] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [skip, setSkip] = useState(0);
    const [hasMoreData, setHasMoreData] = useState(true);
    const SKIP_STEP = 20;
    
    useEffect(() => {
        console.log("Performing sync");
        (async () => { //using an async IAFE so the whole function doest become async
            await Sefaria.history.syncProfile(dispatch, await getUserSettings());
            //console.log(Sefaria.history.history.slice(0, 100));
            console.log("Performing sync done");
            setSynced(true);
        })();
    }, []);
    
    useEffect(() => {
        //here we are getting a "copy" of local history items that we will perform operations on. 
        if(!synced) {console.log("Not synced, quitting"); return;}
        console.log("Performing store load");
        let rstore = Sefaria.history.getLocalHistoryArray(mode);
        let nstore = dedupeAndNormalizeHistoryArray(rstore, mode == "saved");
        setStore([...nstore]);
        console.log("Store after dedupe: ", nstore.slice(0, 100), nstore.length);
    }, [synced, mode]);
    
    useEffect(()=> {
        console.log("Store before load data: ", store)
        if(!store.length) {console.log("Store not loaded, quitting"); return;}
        console.log("Before first load data");
        loadData();
    }, [store, mode]);
    
    const changeMode = (newmode) => {
        if(newmode != mode){
            setStore([]);
            setMode(newmode);  
        }
    };
    
    const onItemsEndReached = () => {
        setSkip(skip + SKIP_STEP);
        loadData();
    };
    
    const loadData = () => {
        console.log("In loadData");
        if (!hasMoreData) {
          console.log("no more data");  
          return;
        }
        console.log("In loadData: starting all the fetch stuff");
        setLoadingData(true);
        console.log("store: ", store);
        console.log("store length: ", store.length);
        console.log("skip: ", skip);
        console.log("slice: ", skip+SKIP_STEP);
        let nitems = store.slice(skip, skip + SKIP_STEP); //get the next 20 items from the raw local history
        console.log("After slice: ", nitems);
        getAnnotatedNextItems(nitems).then( nextItems => {
            console.log(nextItems);
            setData(prevItems => [...prevItems, ...nextItems]);
            if (skip + SKIP_STEP >= store.length) {
                console.log(`flagging no more data: ${skip} + ${SKIP_STEP} >=< ${store.length} `);
                setHasMoreData(false);
            }
            setLoadingData(false);
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
        //console.log("Refs/Sheets for Bulk: ", refs, sheets);
        let [textsAnnotated, sheetsAnnotated] = await getAnnotatedItems(refs, sheets);
        //console.log("Refs/Sheets after Bulk: ", textsAnnotated, sheetsAnnotated);
        // iterate over original items and put the extra data in
        for(let item of items){ //merge the new data into the existing
            if(item?.is_sheet){
                item = {...item, ...sheetsAnnotated[item.sheet_id]};
            }else{
                item = {...item, ...textsAnnotated[item.ref]};
            }
        }
        return items;
    };
    
    const getAnnotatedItems = async(refs, sheets) => {
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
        return num?.[1];
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
    
    const renderFooter = () => {
        if (!loadingData) return null;
    
        return (
          <View style={{ paddingVertical: 20 }}>
            <ActivityIndicator size="large" />
          </View>
        );
    };
    
    const renderItem = (item) => {
      return(
          <View>
            <Text>{item.ref}</Text>
          </View>
      );
    };
    

    return(
        <FlexFrame dir={"column"} flex={1} contentContainerStyle={[styles.navRePage, {alignSelf: "stretch"}]} >
            <PageHeader>
                <FlexFrame justifyContent={"flex-start"}>
                    <StatefulHeader titleKey={"saved"} icon={"bookmark2"} active={mode === "saved"} callbackFunc={()=>{ changeMode("saved")}}/>
                    <StatefulHeader titleKey={"history"} icon={"clock"} active={mode === "history"} callbackFunc={()=>{ changeMode("history")}}/>
                </FlexFrame>
            </PageHeader>
            <FlatList
                data={data}
                keyExtractor={item => item.ref}
                renderItem={renderItem}
                onEndReached={onItemsEndReached}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
              />
        </FlexFrame>
    );
}