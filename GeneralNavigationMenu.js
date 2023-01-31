'use strict';
import PropTypes from 'prop-types';
import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  View,
  Image
} from 'react-native';
import {
  InterfaceText,
  PageHeader,
} from './Misc.js';
import { iconData } from './IconData';
import styles from './Styles.js';
import {useAsyncVariable, useGlobalState} from './Hooks';


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

const GeneralNavMenuButton = ({titleKey, icon}) => {
  const { themeStr } = useGlobalState();
  const myIcon = iconData.get(icon, themeStr);
  return (
      <TouchableOpacity>
        <Image source={myIcon} />
        <InterfaceText stringKey={titleKey} />
      </TouchableOpacity>
  );
}; 

const SpecialNavMenuButton = ({...menuButtonProps}) => {
  return(
      <View style={[styles.systemButtonBlue]}>
        <GeneralNavMenuButton {...menuButtonProps}/>
      </View>
  );
}

const InterfaceLanguageMenuButton = () => {
  
}



const GeneralNavMenuButtonList = () => {
  let menuButtons = useMenuButtonObjects();
  return (
      <View>
        {menuButtons.map(button => <GeneralNavMenuButton key={button.title} titleKey={button.title} icon={button.icon} /> )}
      </View>
  )
}

const useMenuButtonObjects = () => {
  const {isLoggedIn} = useGlobalState();
  return MenuItemsMeta.getMenuItems(isLoggedIn);
}

export class MenuItemsMeta{
  static _items = [
    {title: 'profile', icon: 'profile-nav', loggedIn: true},
    {title: 'signup', icon: 'profile-nav', loggedIn: false} , 
    {title: 'login', icon: 'login', loggedIn: false},
    {title: 'updates', icon: 'bell'}, 
    {title: 'settings', icon: 'settings'}, 
    {title: 'interfaceLanguage', icon: 'globe'}, 
    {title: 'help', icon: 'help'}, 
    {title: 'aboutSefaria', icon: 'about'}, 
    {title: 'logout', icon: 'logout', loggedIn: true},
    {title: 'donate', icon: 'heart-white', loggedIn: false},
  ]
  static getMenuItems(isLoggedIn){
    const filterFunc = (x) => typeof x.loggedIn == 'undefined' || x.loggedIn === isLoggedIn;
    return MenuItemsMeta._items.filter(filterFunc);
  }
  
} 

