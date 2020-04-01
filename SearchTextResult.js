'use strict';
import PropTypes from 'prop-types';
import React, { useContext } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import HTMLView from 'react-native-htmlview'; //to convert html'afied JSON to something react can render (https://github.com/jsdf/react-native-htmlview)
import { GlobalStateContext, getTheme } from './StateManager';
import styles from './Styles.js';

const SearchTextResult = ({ text, title, heTitle, textType, version, onPress }) => {
  const { textLanguage, interfaceLanguage, themeStr } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const isHeb = Sefaria.util.get_menu_language(interfaceLanguage, textLanguage) == "hebrew";
  const refTitleStyle = isHeb ? styles.he : styles.en;
  const refTitle = isHeb ? heTitle : title;
  return (
    <TouchableOpacity style={[styles.searchTextResult, theme.searchTextResult]} onPress={onPress} delayPressIn={200}>
      <Text style={[refTitleStyle, styles.textListCitation, theme.textListCitation]}>{refTitle}</Text>
      <HTMLView
        value={textType == "hebrew" ? "<hediv>"+text+"</hediv>" : "<endiv>"+text+"</endiv>"}
        stylesheet={styles}
        textComponentProps={{style: [textType == "hebrew" ? styles.hebrewText : styles.englishText, theme.text]}}
      />
    {!!version ? <Text style={[styles.enInt, {fontSize: 12, marginTop: 4}, theme.textListCitation]}>{version}</Text> : null}
    </TouchableOpacity>
  );
}
SearchTextResult.propTypes = {
  text:     PropTypes.string,
  title:    PropTypes.string,
  heTitle:  PropTypes.string,
  textType: PropTypes.oneOf(["english","hebrew"]),
  onPress:  PropTypes.func.isRequired
};

export default SearchTextResult;
