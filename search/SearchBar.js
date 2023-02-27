'use strict';
import PropTypes from 'prop-types';
import React, { useRef } from 'react';

import {
  View,
  TextInput,
} from 'react-native';

import {
  CancelButton, InterfaceText,
  SearchButton, SefariaPressable,
} from '../Misc.js';

import styles from '../Styles';
import strings from '../LocalizedStrings';
import {useGlobalState, useIsKeyboardVisible, useRtlFlexDir} from "../Hooks";

const SearchBar = ({
  search,
  setIsNewSearch,
  query,
  onChange,
  onFocus,
  autoFocus,
}) => {
  const { themeStr, theme, interfaceLanguage } = useGlobalState();
  const isKeyboardVisible = useIsKeyboardVisible();
  const textInputRef = useRef(null);
  const isHeb = interfaceLanguage === "hebrew";
  const submitSearch = () => {
    if (query) {
      setIsNewSearch(true);
      search('text', query, true, false, true);
      search('sheet', query, true, false, true);
    }
  };
  const textInputStyle = [styles.searchInput, isHeb ? styles.hebrewSystemFont : null, {textAlign: isHeb ? "right" : "left"}, theme.text];
  const placeholderTextColor = themeStr === "black" ? "#BBB" : "#777";
  const flexDirection = useRtlFlexDir(interfaceLanguage);
  const onCancel = () => {
    onChange("");
  };

  return (
      <View style={[{flexDirection, alignItems: "center", alignSelf: "stretch", justifyContent: "space-between"}]}>
        <View style={[{flexDirection, alignItems: "center", flex: 1, borderRadius: 250, paddingHorizontal: 8}, theme.lighterGreyBackground]}>
          <SearchButton onPress={submitSearch} />
          <TextInput
              ref={textInputRef}
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
              <CancelButton extraStyles={[{height: 12, width: 12}]} onPress={onCancel} />
              : null
          }
        </View>
        { isKeyboardVisible ? (
            <SefariaPressable onPress={()=>{
              textInputRef.current.blur();
            }} extraStyles={{marginLeft: 15}}>
              <InterfaceText stringKey={"cancel"} extraStyles={[styles.fontSize16, theme.tertiaryText]}/>
            </SefariaPressable>
        ) : null}
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
