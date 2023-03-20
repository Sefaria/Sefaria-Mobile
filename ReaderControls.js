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
  SaveButton,
} from './Misc.js';
import { GlobalStateContext, getTheme } from './StateManager';
import { iconData } from "./IconData";
import Sefaria from "./sefaria";

const ReaderControls = ({
  enRef,
  heRef,
  categories,
  openTextToc,
  openSheetMeta,
  goBack,
  toggleReaderDisplayOptionsMenu,
  openUri,
  sheet,
  getHistoryObject,
  showToast,
}) => {
  const { themeStr, textLanguage, interfaceLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const historyItem = getHistoryObject();
  const isHeb = Sefaria.util.get_menu_language(interfaceLanguage, textLanguage) == "hebrew";
  var langStyle = isHeb ? [styles.he] : [styles.en, sheet ? {lineHeight: 28} : {marginBottom: -5.3}];
  var titleTextStyle = [langStyle, styles.headerTextTitleText, theme.text];
  const leftMenuButton = (
      <DirectedButton
          onPress={goBack}
          imageStyle={[styles.menuButton, styles.directedButton]}
          language="english"
          direction="back"
      />
  );
    var textTitle = isHeb ? heRef : enRef;
    if (sheet) {
      textTitle = Sefaria.util.stripHtml(sheet.title);
    }
  return (
      <View style={[styles.header, theme.header]}>
        {leftMenuButton}
        <View style={styles.readerNavSectionMoreInvisible}>
          <Image
            style={styles.starIcon}
            source={iconData.get('bookmark-unfilled', 'white')}
            resizeMode={'contain'}
          />
        </View>
        <TouchableOpacity style={styles.headerTextTitle} onPress={sheet ? openSheetMeta : openTextToc }>
          <View style={styles.headerTextTitleInner}>
            <Image source={iconData.get('caret', themeStr)}
                     style={[styles.downCaret, isHeb ? null: {opacity: 0}]}
                     resizeMode={'contain'} />

            {sheet ?
                <Text lang={textLanguage} style={titleTextStyle} numberOfLines={1} ellipsizeMode={"middle"}><HebrewInEnglishText text={sheet.title} stylesHe={[styles.heInEn]} stylesEn={[]}/></Text> :
                <SText lang={textLanguage} style={titleTextStyle} numberOfLines={1} ellipsizeMode={"middle"} lineMultiplier={Platform.OS == 'ios' ? 1.5 : 1}>{textTitle}</SText>
            }
            <Image source={iconData.get('caret', themeStr)}
                     style={[styles.downCaret, isHeb ? {opacity: 0} : null]}
                     resizeMode={'contain'} />
          </View>
          <CategoryAttribution
            categories={categories}
            context={"header"}
            linked={false}
            openUri={openUri}
          />
        </TouchableOpacity>
        <SaveButton
          historyItem={historyItem}
          showToast={showToast}
        />
        <DisplaySettingsButton onPress={toggleReaderDisplayOptionsMenu} />
      </View>
  );
}
ReaderControls.propTypes = {
  enRef:                           PropTypes.string,
  heRef:                           PropTypes.string,
  categories:                      PropTypes.array,
  openTextToc:                     PropTypes.func,
  goBack:                          PropTypes.func,
  toggleReaderDisplayOptionsMenu:  PropTypes.func,
  openUri:                         PropTypes.func.isRequired,
  getHistoryObject:                PropTypes.func.isRequired,
  showToast:                       PropTypes.func.isRequired,
};
ReaderControls.whyDidYouRender = true;

export default ReaderControls;
