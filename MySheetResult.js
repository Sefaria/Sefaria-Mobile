'use strict';
import PropTypes from 'prop-types';
import React, { useContext } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { GlobalStateContext } from './StateManager';
import strings from './LocalizedStrings';

import styles from './Styles.js';

const MySheetResult = ({ title, heTitle, onPress, views, tags, created, isPrivate }) => {
  const { theme, interfaceLanguage } = useContext(GlobalStateContext);
  const isHeb = interfaceLanguage === 'hebrew';
  const locale = isHeb ? 'iw-IL' : 'en-US';
  const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  const date = (new Date(created)).toLocaleDateString(locale, dateOptions).replace(',', '')
  return (
    <TouchableOpacity
      style={[
        styles.textBlockLink,
        theme.textBlockLink,
        {margin:0, borderBottomWidth: 1, borderBottomColor: "#ccc", paddingTop: 13, alignItems: 'flex-start'}
      ]}
      onPress={onPress}
    >
      <View style={{flex: 1, flexDirection: (isHeb ? "row-reverse" : "row")}}>
        <Text style={[styles.sheetListTitle, {textAlign: isHeb ? "right" : "left"}]}>{title.replace(/\s\s+/g, ' ')}</Text>
        {
          isPrivate ?
            <Image style={{marginTop: 6, marginHorizontal: 8, width:15, height: 15}} source={require('./img/lock.png')}/>
          : null
        }
      </View>
      <View style={{flex: 1, flexDirection: (isHeb ? "row-reverse" : "row")}}>
        <Text style={[theme.tertiaryText]}>
          {`${views} ${strings.views} • ${date}`}
          { !!tags.length ? ` • ${tags.join(', ')}` : null }
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
