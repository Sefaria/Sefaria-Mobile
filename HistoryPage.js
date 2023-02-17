'use strict';

import PropTypes from 'prop-types';

import React, {useContext, useState} from 'react';
import {
    Text,
    TouchableOpacity,
    View,
    FlatList,
    Image,
    RefreshControl, ScrollView,
} from 'react-native';
import {
    CategoryColorLine,
    CategorySideColorLink,
    DirectedButton,
    LanguageToggleButton,
    AnimatedRow,
    SText, PageHeader, Header, StatefulHeader, FlexFrame,
} from './Misc.js';
import { DispatchContext, STATE_ACTIONS } from './StateManager';
import SwipeableFlatList from './SwipeableFlatList';
import styles from './Styles';
import strings from './LocalizedStrings';
import {iconData} from "./IconData";
import { useGlobalState } from './Hooks.js';
import {ShortDedication} from "./Dedication";



export const HistoryPage = ({}) => {
    const [mode, setMode] = useState("history");
    
    
    return(
        <ScrollView contentContainerStyle={[styles.navRePage]} >
            <PageHeader>
                <FlexFrame>
                    <StatefulHeader titleKey={"saved"} icon={"saved"} active={mode === "saved"} callbackFunc={()=>{ setMode("saved")}}/>
                    <StatefulHeader titleKey={"history"} icon={"clock"} active={mode === "history"} callbackFunc={()=>{ setMode("history")}}/>
                </FlexFrame>
            </PageHeader>
        </ScrollView>
    );
}