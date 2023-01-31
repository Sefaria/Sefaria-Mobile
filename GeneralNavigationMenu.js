'use strict';
import PropTypes from 'prop-types';
import React, { useContext, useState, useEffect, useReducer, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableNativeFeedback,
  TouchableWithoutFeedback,
  View,
  Image,
  Platform,
  Linking,
  Alert,
} from 'react-native';

import {
  CategoryColorLine,
  CategoryBlockLink,
  InterfaceText,
  PageHeader,
  TwoBox,
  SystemButton,
  LoadingView, SefariaPressable,
} from './Misc.js';
import { STATE_ACTIONS, DispatchContext, GlobalStateContext, getTheme } from './StateManager';
import VersionNumber from 'react-native-version-number';
import ActionSheet from 'react-native-action-sheet';
import SearchBar from './SearchBar';
import ReaderNavigationCategoryMenu from './ReaderNavigationCategoryMenu';
import styles from './Styles.js';
import strings from './LocalizedStrings.js';
import Sefaria from './sefaria';
import {
  getFullBookList,
  getLocalBookList,
  PackagesState
} from './DownloadControl';
import {useAsyncVariable, useGlobalState} from './Hooks';
import ReaderNavigationMenu from "./ReaderNavigationMenu";

/**
 * Navigation menu for misc areas of the app that are not the text reader interfaces
 * Copied from SefariaProject's `MobileNavMenu` component
 * @param props
 * @constructor
 */
export const GeneralNavigationMenu = props => {
    return (
        <ScrollView style={{flex:1}} contentContainerStyle={{flex:1, alignContent: "flex-start"}}>
          <PageHeader titleKey={"account"}/>
          <GeneralNavMenuButtonList />
        </ScrollView>
    );
}

const GeneralNavMenuButton = ({titleKey}) => {
  return (
      <TouchableOpacity>
        <InterfaceText stringKey={titleKey} />
      </TouchableOpacity>
  );
}; 

const GeneralNavMenuButtonList = () => {
  let menuButtons = useMenuButtonObjects();
  return (
      <View>
        {menuButtons.map(button => <GeneralNavMenuButton key={button.title} titleKey={button.title} /> )}
      </View>
  )
}

const useMenuButtonObjects = () => {
  const {isLoggedIn} = useGlobalState();
  return MenuItemsMeta.getMenuItems(isLoggedIn);
}

export class MenuItemsMeta{
  static _items = [
    {title: 'profile', icon: 'profile', loggedIn: true, },
    {title: 'logIn', icon: 'login', loggedIn: false },
    {title: 'updates', icon: 'profile'}  
  ]
  static getMenuItems(isLoggedIn){
    const filterFunc = (x) => typeof x.loggedIn == 'undefined' || x.loggedIn === isLoggedIn;
    return MenuItemsMeta._items.filter(filterFunc);
  }
  
} 

