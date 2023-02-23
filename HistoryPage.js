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





export const HistoryPage = ({}) => {
    const dispatch = useContext(DispatchContext);  
    const getUserSettings = useGetUserSettingsObj();
    const [mode, setMode] = useState("saved");
    const [store, setStore] = useState([]);
    const [storeLoading, setStoreLoading] = useState(true);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [skip, setSkip] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const SKIP_STEP = 20;
    
    useEffect(() => {
        (async () => { //using an async IAFE so the whole function doest become async
            await Sefaria.history.syncProfile(dispatch, await getUserSettings());
            //console.log(Sefaria.history.history.slice(0, 100));
            setStoreLoading(false);
        })();
    }, []);
    
    useEffect(() => {
        //here we are getting a "copy" of local history items that we will perform operations on. 
        if(storeLoading) return;
        let store = Sefaria.history[mode];
        store = dedupeAndNormalizeHistoryArray(store, mode == "saved");
        setStore(store); 
        loadData();
    }, [mode, storeLoading]);
    
    /*useEffect(() => {
        loadData();
    }, []);*/
    
    const onItemsEndReached = () => {
        setSkip(skip + SKIP_STEP);
        loadData();
    }
    
    const loadData = () => {
        if (!hasMore) {
          return;
        }
        setLoading(true);
        let nitems = store.slice(skip, skip + SKIP_STEP); //get the next 20 items from the raw local history
        getAnnotatedNextItems(nitems).then( nextItems => {
            console.log(nextItems);
            setData(prevItems => [...prevItems, ...nextItems]);
            if (skip + SKIP_STEP >= store.length) {
                setHasMore(false);
            }
            setLoading(false);
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
        if (!loading) return null;
    
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
        <View contentContainerStyle={[styles.navRePage, {alignSelf: "stretch", flex: 1}]} >
            <PageHeader>
                <FlexFrame justifyContent={"flex-start"}>
                    <StatefulHeader titleKey={"saved"} icon={"bookmark2"} active={mode === "saved"} callbackFunc={()=>{ setMode("saved")}}/>
                    <StatefulHeader titleKey={"history"} icon={"clock"} active={mode === "history"} callbackFunc={()=>{ setMode("history")}}/>
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
        </View>
    );
}