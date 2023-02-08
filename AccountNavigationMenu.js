'use strict';
import PropTypes from 'prop-types';
import React, {useState, useEffect, useCallback, useContext} from 'react';
import {
    ScrollView,
    TouchableOpacity,
    View,
    Image, Text,
} from 'react-native';
import { InterfaceText,PageHeader, Sefaria501} from './Misc.js';
import { iconData } from './IconData';
import styles from './Styles.js';
import {useGlobalState} from './Hooks';
import { GlobalStateContext, DispatchContext, STATE_ACTIONS, getTheme } from './StateManager';
import Sefaria from "./sefaria";
import strings from "./LocalizedStrings";
import {ShortDedication} from "./Dedication";


/**
 * Navigation menu for misc areas of the app that are not the text reader interfaces
 * Copied from SefariaProject's `MobileNavMenu` component
 * @param props
 * @constructor
 */
export const AccountNavigationMenu = props => {
    const { theme, interfaceLanguage } = useGlobalState();
    const directionStyle = interfaceLanguage == "english" ? styles.navReEnglish : styles.navReHebrew;
    return (
        <ScrollView style={[styles.navRePage, directionStyle]} contentContainerStyle={[{flex:1, alignContent: "flex-start"}]}>
            <PageHeader titleKey={"account"}/>
            <AccountNavigationMenuButtonList {...props} />
            <ShortDedication openDedication={() => props.openMenu("dedication", "AccountNavigationMenu")}/>
            <Sefaria501/>
        </ScrollView>
    );
}

const AccountNavigationMenuButtonList = ({openMenu, openUri, logout}) => {
  let menuButtons = useMenuButtonObjects();
  return (
      <View>
        {menuButtons.map(({ title, icon, ButtonComponent, componentProps }) => {
            let callbackFunc = null;
            let action = componentProps?.["action"];
            if(action == "menu"){
                callbackFunc = () => openMenu(componentProps["destination"], "AccountNavigationMenu", componentProps?.["pushHistory"]);
            }else if(action == "uri"){
                callbackFunc = () => openUri(componentProps["destination"]);  
            }else if(action =="logout"){
                callbackFunc = () => logout();   
            }
            return <ButtonComponent key={title} titleKey={title} icon={icon} callbackFunc={callbackFunc} />
        })}
      </View>
  )
}

const AccountNavigationMenuButton = ({titleKey, icon, callbackFunc, textStyles, containerStyles}) => {
  const { themeStr, theme, interfaceLanguage } = useGlobalState();
  const myIcon = iconData.get(icon, themeStr);
  return (
      <TouchableOpacity style={[styles.navReAccountMenuButton, theme.tertiaryText, theme.lighterGreyBorder].concat(containerStyles)} onPress={callbackFunc}>
        <Image style={styles.navReAccountMenuButtonIcon} source={myIcon} />
        <InterfaceText extraStyles={[styles.navReAccountMenuButtonText, theme.tertiaryText].concat(textStyles)} stringKey={titleKey} />
      </TouchableOpacity>
  );
}; 

const ColoredAccountNavigationMenuButton = ({...menuButtonProps}) => {
    return(
          <View style={[styles.systemButtonBlue]}>
            <AccountNavigationMenuButton {...menuButtonProps}/>
          </View>
      );
}

const InterfaceLanguageMenuButton = () => {
      const dispatch = useContext(DispatchContext);
      const {themeStr, theme, interfaceLanguage } = useGlobalState();
      const setInterfaceLanguage = language => {
        dispatch({ //this is copied from ButtonToggleSection, is there a way to not duplicate code? 
          type: STATE_ACTIONS.setInterfaceLanguage,
          value: language,
          time: Sefaria.util.epoch_time(),
        });
      };
      const myIcon = iconData.get("globe", themeStr);
      return (
          <View style={[styles.navReAccountMenuButton, theme.lighterGreyBorder]}>
              <Image style={styles.navReAccountMenuButtonIcon} source={myIcon} />
              <TouchableOpacity onPress={() => setInterfaceLanguage("english")} ><Text style={[styles.enInt, styles.navReAccountMenuButtonText, theme.tertiaryText, interfaceLanguage == 'hebrew' ? theme.interfaceLangToggleInActive : null]}>English</Text></TouchableOpacity>
              <Text style={[styles.navReAccountMenuButtonSep]}>•</Text>
              <TouchableOpacity onPress={() => setInterfaceLanguage("hebrew")} ><Text style={[styles.heInt, styles.navReAccountMenuButtonText, theme.tertiaryText, interfaceLanguage == 'english' ? theme.interfaceLangToggleInActive : null]}>עברית</Text></TouchableOpacity>
          </View>
      );
}


const useMenuButtonObjects = () => {
  const {isLoggedIn} = useGlobalState();
  return MenuItemsMeta.getMenuItems(isLoggedIn);
}

export class MenuItemsMeta{
  static _items = [
    {title: 'profile', icon: 'profile-nav', loggedIn: true, ButtonComponent: AccountNavigationMenuButton, componentProps:{action: "menu", destination:"profile"}},
    {title: 'signup', icon: 'profile-nav', loggedIn: false, ButtonComponent: AccountNavigationMenuButton, componentProps:{action: "menu", pushHistory: false,  destination:"register"}} , 
    {title: 'login', icon: 'login', loggedIn: false, ButtonComponent: AccountNavigationMenuButton, componentProps:{action: "menu",  pushHistory: false, destination:"login"}},
    {title: 'updates', icon: 'bell', ButtonComponent: AccountNavigationMenuButton, componentProps:{action: "menu", destination:"updates"}}, 
    {title: 'settings', icon: 'settings', ButtonComponent: AccountNavigationMenuButton, componentProps:{action: "menu", destination:"settings"}}, 
    {title: 'interfaceLanguage', icon: 'globe', ButtonComponent: InterfaceLanguageMenuButton, componentProps: {}}, 
    {title: 'help', icon: 'help', ButtonComponent: AccountNavigationMenuButton, componentProps:{action: "uri", destination:"https://www.sefaria.org/help"}}, 
    {title: 'aboutSefaria', icon: 'about', ButtonComponent: AccountNavigationMenuButton, componentProps:{action: "uri", destination:"https://www.sefaria.org/about"}}, 
    {title: 'logout', icon: 'logout', loggedIn: true, ButtonComponent: AccountNavigationMenuButton, componentProps:{action: "logout"}},
    {title: 'donate', icon: 'heart-white', ButtonComponent: ColoredAccountNavigationMenuButton, componentProps:{action: "uri", destination:"https://www.sefaria.org/donate/mobile"}},
  ]
  static getMenuItems(isLoggedIn){
    const filterFunc = (x) => typeof x.loggedIn == 'undefined' || x.loggedIn === isLoggedIn;
    return MenuItemsMeta._items.filter(filterFunc);
  }
  
} 

