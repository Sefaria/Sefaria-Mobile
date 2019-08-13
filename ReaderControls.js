'use strict';

import PropTypes from 'prop-types';
import React, { useContext, useReducer } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  Image,
  Platform,
} from 'react-native';

import ReaderDisplayOptionsMenu from './ReaderDisplayOptionsMenu';
import styles from './Styles.js';
import {
  MenuButton,
  DirectedButton,
  DisplaySettingsButton,
  CategoryAttribution,
  SText,
  HebrewInEnglishText,
} from './Misc.js';
import { GlobalStateContext } from './StateManager';
import Sefaria from "./sefaria";

const ReaderControls = ({
  enRef,
  heRef,
  categories,
  openNav,
  openTextToc,
  goBack,
  toggleReaderDisplayOptionsMenu,
  backStack,
  openUri,
  sheet,
}) => {
  const { theme, themeStr, menuLanguage } = useContext(GlobalStateContext);
  const [, forceUpdate] = useReducer(x => x + 1, 0);  // HACK
  const shouldShowHamburger = () => {
    if (Platform.OS === "android") { return true; }
    else {
      // see ReaderApp.openRef()
      const calledFromDict = { "text list": true, "search": true };
      return backStack.filter(x => calledFromDict[x.calledFrom]).length === 0;
    }
  };
  const isSaved = Sefaria.history.indexOfSaved(enRef) !== -1;
  var langStyle = menuLanguage === "hebrew" ? [styles.he, {marginTop: 4}] : [styles.en];
  var titleTextStyle = [langStyle, styles.headerTextTitleText, theme.text];
  if (shouldShowHamburger()) {
    var leftMenuButton = <MenuButton onPress={openNav} />
  } else {
    var leftMenuButton =
      <DirectedButton
        onPress={goBack}
        imageStyle={[styles.menuButton, styles.directedButton]}
        language="english"
        direction="back"/>
  }
    var textTitle = menuLanguage === 'hebrew' ? heRef : enRef;
    if (sheet) {
      textTitle = Sefaria.util.stripHtml(sheet.title);
    }
  return (
      <View style={[styles.header, theme.header]}>
        {leftMenuButton}
        <View style={styles.readerNavSectionMoreInvisible}>
          <Image
            style={styles.starIcon}
            source={require('./img/starUnfilled.png')}
            resizeMode={'contain'}
          />
        </View>
        <TouchableOpacity style={styles.headerTextTitle} onPress={sheet ? openSheetMeta : openTextToc }>
          <View style={styles.headerTextTitleInner}>
            <Image source={themeStr == "white" ? require('./img/caret.png'): require('./img/caret-light.png') }
                     style={[styles.downCaret, menuLanguage === "hebrew" ? null: {opacity: 0}]}
                     resizeMode={'contain'} />

            {sheet ?
                <Text lang={menuLanguage} style={titleTextStyle} numberOfLines={1} ellipsizeMode={"tail"}><HebrewInEnglishText text={sheet.title} stylesHe={[styles.heInEn]} stylesEn={[]}/></Text> :
                <SText lang={menuLanguage} style={titleTextStyle} numberOfLines={1} ellipsizeMode={"tail"}>{textTitle}</SText>
            }
            <Image source={themeStr == "white" ? require('./img/caret.png'): require('./img/caret-light.png') }
                     style={[styles.downCaret, menuLanguage === "hebrew" ? {opacity: 0} : null]}
                     resizeMode={'contain'} />
          </View>
          <CategoryAttribution
            categories={categories}
            context={"header"}
            linked={false}
            openUri={openUri}
          />
        </TouchableOpacity>
          {sheet ? <View style={{width: 40}}></View> :
        <TouchableOpacity onPress={
            () => {
              const willBeSaved = !isSaved;
              Sefaria.history.saveSavedItem(
                {
                  ref: enRef,
                  heRef,
                  language: textLanguage,
                  book: Sefaria.textTitleForRef(enRef),
                  saved: willBeSaved,
                  versions: {},
                },
                willBeSaved ? 'add_saved' : 'delete_saved'
              );
              forceUpdate();
            }
          }>
          <Image
            style={styles.starIcon}
            source={themeStr == "white" ?
                    (isSaved ? require('./img/starFilled.png') : require('./img/starUnfilled.png')) :
                    (isSaved ? require('./img/starFilled-light.png') : require('./img/starUnfilled-light.png'))}
            resizeMode={'contain'}
          />
        </TouchableOpacity> }
        <DisplaySettingsButton onPress={toggleReaderDisplayOptionsMenu} />
      </View>
  );
}
ReaderControls.propTypes = {
  enRef:                           PropTypes.string,
  heRef:                           PropTypes.string,
  categories:                      PropTypes.array,
  openNav:                         PropTypes.func,
  openTextToc:                     PropTypes.func,
  goBack:                          PropTypes.func,
  toggleReaderDisplayOptionsMenu:  PropTypes.func,
  backStack:                       PropTypes.array,
  openUri:                         PropTypes.func.isRequired,
};

export default ReaderControls;
