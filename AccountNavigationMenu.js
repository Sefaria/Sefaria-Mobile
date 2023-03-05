'use strict';
import PropTypes from 'prop-types';
import React, {useState, useEffect, useCallback, useContext} from 'react';
import {
    ScrollView,
    TouchableOpacity,
    View,
    Image, Text,
} from 'react-native';
import {FlexFrame, InterfaceText, PageHeader, Header, Sefaria501} from './Misc.js';
import {iconData} from './IconData';
import styles from './Styles.js';
import {useGlobalState} from './Hooks';
import {GlobalStateContext, DispatchContext, STATE_ACTIONS, getTheme} from './StateManager';
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
    const { theme } = useGlobalState();
    return (
        <ScrollView style={[styles.alignSelf, theme.mainTextPanel]} contentContainerStyle={{alignItems: "stretch"}}>
            <View style={styles.navRePage}>
                <PageHeader><Header titleKey={"account"}/></PageHeader>
            </View>
            <AccountNavigationMenuButtonList {...props} />
            <View style={[styles.navRePage, {alignItems: 'center'}]}>
                <ShortDedication openDedication={() => props.openMenu("dedication", "AccountNavigationMenu")}/>
                <Sefaria501/>
            </View>
        </ScrollView>
    );
}

const AccountNavigationMenuButtonList = ({openMenu, openUri, logout}) => {
    let menuButtons = useMenuButtonObjects();
    return (
        <View>
            {menuButtons.map(({title, icon, ButtonComponent, actionProps, componentProps = {}}) => {
                let callbackFunc = null;
                let action = actionProps?.["action"];
                if (action == "menu") {
                    callbackFunc = () => openMenu(actionProps["destination"], "AccountNavigationMenu", actionProps?.["pushHistory"]);
                } else if (action == "uri") {
                    callbackFunc = () => openUri(actionProps["destination"]);
                } else if (action == "logout") {
                    callbackFunc = () => logout();
                }
                let {textStyles = [], containerStyles = []} = componentProps;
                return <ButtonComponent key={title} titleKey={title} icon={icon} textStyles={textStyles}
                                        containerStyles={containerStyles} callbackFunc={callbackFunc}/>
            })}
        </View>
    )
}

const AccountNavigationMenuButton = ({titleKey, icon, callbackFunc, textStyles, containerStyles}) => {
    const {themeStr, theme, interfaceLanguage} = useGlobalState();
    const myIcon = iconData.get(icon, themeStr);
    return (
        <TouchableOpacity
            style={[{marginHorizontal: 15}, styles.navReAccountMenuButton, interfaceLanguage == "hebrew" ? styles.navReHebrew : null, theme.tertiaryText, theme.lighterGreyBorder].concat(containerStyles)}
            onPress={callbackFunc}>
            <Image style={styles.navReAccountMenuButtonIcon} source={myIcon}/>
            <InterfaceText extraStyles={[styles.navReAccountMenuButtonText, theme.tertiaryText].concat(textStyles)}
                           stringKey={titleKey}/>
        </TouchableOpacity>
    );
};

const SefariaBackgroundAccountNavigationMenuButton = ({...menuButtonProps}) => {
    const {theme} = useGlobalState();
    return (<AccountNavigationMenuButton {...menuButtonProps} textStyles={[theme.sefariaColorButtonText]}
                                         containerStyles={[theme.sefariaColorButton, styles.navReUpToEdge]}/>);
};

const SefariaTextAccountNavigationMenuButton = ({...menuButtonProps}) => {
    const {theme} = useGlobalState();
    return (<AccountNavigationMenuButton {...menuButtonProps} textStyles={[theme.sefariaColorText]}/>);
};

const SecondaryTextAccountNavigationMenuButton = ({...menuButtonProps}) => {
    const {theme} = useGlobalState();
    return (<AccountNavigationMenuButton {...menuButtonProps} textStyles={[theme.secondaryText]}/>);
};

const InterfaceLanguageMenuButton = () => {
    const dispatch = useContext(DispatchContext);
    const {themeStr, theme, interfaceLanguage} = useGlobalState();
    const setInterfaceLanguage = language => {
        dispatch({ //this is copied from ButtonToggleSection, is there a way to not duplicate code? 
            type: STATE_ACTIONS.setInterfaceLanguage,
            value: language,
            time: Sefaria.util.epoch_time(),
        });
    };
    const myIcon = iconData.get("globe", themeStr);
    return (
        <View
            style={[{marginHorizontal: 15}, styles.navReAccountMenuButton, theme.lighterGreyBorder, interfaceLanguage == "hebrew" ? styles.navReHebrew : null]}>
            <Image style={styles.navReAccountMenuButtonIcon} source={myIcon}/>
            <TouchableOpacity onPress={() => setInterfaceLanguage("english")}><Text
                style={[styles.enInt, styles.navReAccountMenuButtonText, theme.tertiaryText, interfaceLanguage == 'hebrew' ? theme.interfaceLangToggleInActive : null]}>English</Text></TouchableOpacity>
            <Text style={[styles.navReAccountMenuButtonSep, theme.secondaryText]}>•</Text>
            <TouchableOpacity onPress={() => setInterfaceLanguage("hebrew")}><Text
                style={[styles.heInt, styles.navReAccountMenuButtonText, theme.tertiaryText, interfaceLanguage == 'english' ? theme.interfaceLangToggleInActive : null]}>עברית</Text></TouchableOpacity>
        </View>
    );
}


const useMenuButtonObjects = () => {
    const {isLoggedIn} = useGlobalState();
    return MenuItemsMeta.getMenuItems(isLoggedIn);
}

export class MenuItemsMeta {
    static _items = [
        /*{title: 'profile', icon: 'profile-nav', loggedIn: true, ButtonComponent: AccountNavigationMenuButton, actionProps:{action: "menu", destination:"profile"}},*/
        {
            title: 'mySheets',
            icon: 'sheet',
            loggedIn: true,
            ButtonComponent: AccountNavigationMenuButton,
            actionProps: {action: "menu", destination: "mySheets"}
        },
        {
            title: 'signup',
            icon: 'profile-nav',
            loggedIn: false,
            ButtonComponent: SefariaTextAccountNavigationMenuButton,
            actionProps: {action: "menu", destination: "register"}
        },
        {
            title: 'login',
            icon: 'login',
            loggedIn: false,
            ButtonComponent: AccountNavigationMenuButton,
            actionProps: {action: "menu", destination: "login"}
        },
        /*{title: 'updates', icon: 'bell', ButtonComponent: AccountNavigationMenuButton, actionProps:{action: "menu", destination:"updates"}},*/
        {
            title: 'settings',
            icon: 'settings',
            ButtonComponent: AccountNavigationMenuButton,
            actionProps: {action: "menu", destination: "settings"}
        },
        {title: 'interfaceLanguage', icon: 'globe', ButtonComponent: InterfaceLanguageMenuButton, actionProps: {}},
        {
            title: 'help',
            icon: 'help',
            ButtonComponent: AccountNavigationMenuButton,
            actionProps: {action: "uri", destination: "https://www.sefaria.org/help"}
        },
        {
            title: 'aboutSefaria',
            icon: 'about',
            ButtonComponent: AccountNavigationMenuButton,
            actionProps: {action: "uri", destination: "https://www.sefaria.org/about"}
        },
        {
            title: 'logout',
            icon: 'logout',
            loggedIn: true,
            ButtonComponent: SecondaryTextAccountNavigationMenuButton,
            actionProps: {action: "logout"}
        },
        {
            title: 'donate',
            icon: 'heart-white',
            ButtonComponent: SefariaBackgroundAccountNavigationMenuButton,
            actionProps: {action: "uri", destination: "https://www.sefaria.org/donate/mobile"}
        },
    ]

    static getMenuItems(isLoggedIn) {
        const filterFunc = (x) => typeof x.loggedIn == 'undefined' || x.loggedIn === isLoggedIn;
        return MenuItemsMeta._items.filter(filterFunc);
    }
} 

