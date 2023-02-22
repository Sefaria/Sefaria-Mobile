'use strict';
import PropTypes from 'prop-types';
import React, { useContext } from 'react';

import {
  TouchableOpacity,
  Text,
  View,
  TextInput,
  Image,
} from 'react-native';

import {
  DirectedButton,
  CloseButton,
  CancelButton,
  SearchButton,
  LanguageToggleButton,
} from '../Misc.js';
import { GlobalStateContext, getTheme } from '../StateManager';
import AutocompleteList from './AutocompleteList';

import styles from '../Styles';
import strings from '../LocalizedStrings';

const SearchBar = ({
  search,
  setIsNewSearch,
  query,
  onChange,
  onFocus,
  autoFocus,
}) => {
  const { themeStr, interfaceLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);

  const submitSearch = () => {
    if (query) {
      setIsNewSearch(true);
      search('text', query, true, false, true);
      search('sheet', query, true, false, true);
    }
  };
  const textInputStyle = [styles.searchInput, interfaceLanguage === "hebrew" ? styles.hebrewSystemFont : null, theme.text];
  const placeholderTextColor = themeStr === "black" ? "#BBB" : "#777";
  return (
    <View style={[{flexDirection: 'row', alignItems: "center", flex:0, borderRadius: 250, paddingStart: 18}, theme.lighterGreyBackground]}>
        <SearchButton onPress={submitSearch} />
        <TextInput
          autoFocus={autoFocus}
          style={textInputStyle}
          onChangeText={onChange}
          onSubmitEditing={submitSearch}
          onFocus={onFocus}
          value={query}
          underlineColorAndroid={"transparent"}
          placeholder={strings.search}
          placeholderTextColor={placeholderTextColor}
          autoCorrect={false} />
        {query.length ?
          <CancelButton extraStyles={[{height: 12, width: 12}]} onPress={() => { onChange(""); }} />
          : null
        }
    </View>
  );
}
SearchBar.propTypes = {
  search:          PropTypes.func.isRequired,
  setIsNewSearch:  PropTypes.func.isRequired,
  query:           PropTypes.string.isRequired,
  onChange:        PropTypes.func.isRequired,
  onFocus:         PropTypes.func,
};

export default SearchBar;
