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

const SearchTextResult = ({ text, title, heTitle, textType, onPress }) => {
  const { textLanguage, themeStr } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const refTitleStyle = textLanguage === "hebrew" ? styles.he : styles.en;
  const refTitle = textLanguage === "hebrew" ? heTitle : title;
  return (
    <TouchableOpacity style={[styles.searchTextResult, theme.searchTextResult]} onPress={onPress}>
      <Text style={[refTitleStyle, styles.textListCitation, theme.textListCitation]}>{refTitle}</Text>
      <HTMLView
        value={textType == "hebrew" ? "<hediv>"+text+"</hediv>" : "<endiv>"+text+"</endiv>"}
        stylesheet={styles}
        textComponentProps={{style: [textType == "hebrew" ? styles.hebrewText : styles.englishText, theme.text]}}
      />
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
