'use strict';
import PropTypes from 'prop-types';
import React  from 'react';
import {
  Text,
  TouchableOpacity,
} from 'react-native';
import { SimpleHTMLView } from '../Misc';
import styles from '../Styles.js';
import {useGlobalState} from "../Hooks";

const SearchTextResult = ({ text, title, heTitle, textType, version, onPress }) => {
  const { textLanguage, interfaceLanguage, theme } = useGlobalState();
  const isHeb = Sefaria.util.get_menu_language(interfaceLanguage, textLanguage) === "hebrew";
  const refTitleStyle = isHeb ? styles.he : styles.en;
  const refTitle = isHeb ? heTitle : title;
  return (
    <TouchableOpacity style={[styles.searchTextResult, theme.searchTextResult]} onPress={onPress} delayPressIn={200}>
      <Text style={[refTitleStyle, styles.textListCitation, theme.textListCitation]}>{refTitle}</Text>
      <SimpleHTMLView text={text} lang={textType} />
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
