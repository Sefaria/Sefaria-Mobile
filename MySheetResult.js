'use strict';
import PropTypes from 'prop-types';
import React, { useContext } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { GlobalStateContext, getTheme } from './StateManager';
import strings from './LocalizedStrings';

import styles from './Styles.js';

const MySheetResult = ({ title, heTitle, onPress, views, topics, created, isPrivate }) => {
  const { themeStr, interfaceLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const isHeb = interfaceLanguage === 'hebrew';
  title = title.replace(/\s\s+/g, ' ');
  const isTitleHeb = Sefaria.hebrew.isHebrew(title);
  const locale = isHeb ? 'iw-IL' : 'en-US';
  const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  const date = (new Date(created)).toLocaleDateString(locale, dateOptions).replace(',', '')
  return (
    <TouchableOpacity
      style={[
        styles.textBlockLink,
        theme.textBlockLink,
        {margin:0, borderBottomWidth: 1, borderBottomColor: "#ccc", paddingVertical: 13, alignItems: isHeb ? 'flex-end' : 'flex-start'}
      ]}
      onPress={onPress}
    >
      <View style={{flex: 1, flexDirection: (isHeb ? "row-reverse" : "row")}}>
        <Text style={[isTitleHeb ? styles.hebrewText : styles.englishText, isTitleHeb ? null : {paddingTop: 6}, styles.mySheetListTitle, theme.text]}>{title}</Text>
        {
          isPrivate ?
            <Image style={{marginTop: 5, marginHorizontal: 8, width:15, height: 15}} source={require('./img/lock.png')}/>
          : null
        }
      </View>
      <View style={{flex: 1, flexDirection: (isHeb ? "row-reverse" : "row")}}>
        <Text style={[theme.tertiaryText, isHeb ? styles.heInt : styles.enInt, isHeb ? { writingDirection: 'rtl'} : null]}>
          {`${views} ${strings.views} • ${date}`}
          { !!topics.length ? ` • ${topics.map(t => t.asTyped).join(', ')}` : null }
        </Text>
      </View>
    </TouchableOpacity>
  );
}
MySheetResult.propTypes = {
  title:    PropTypes.string,
  heTitle:  PropTypes.string,
  onPress:  PropTypes.func.isRequired,
  views:    PropTypes.number,
  tags:     PropTypes.array,
  created:  PropTypes.string,
  isPrivate:PropTypes.bool,
};

export default MySheetResult;
