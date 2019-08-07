'use strict';
import PropTypes from 'prop-types';
import React from 'react';

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
  SearchButton,
  LanguageToggleButton,
} from './Misc.js';
import { GlobalStateContext } from './StateManager';
import AutocompleteList from './AutocompleteList';

import styles from './Styles';
import strings from './LocalizedStrings';

const SearchBar = ({
  onBack,
  search,
  setIsNewSearch,
  searchType,
  toggleLanguage,
  language,
  hideSearchButton,
  query,
  onChange,
  onFocus,
}) {

  const submitSearch = () => {
    if (query) {
      setIsNewSearch(true);
      console.log('submitSearch', query);
      search('text', query, true, false, true);
      search('sheet', query, true, false, true);
    }
  };

  render() {
    const { theme, themeStr, interfaceLang, menuLanguage } = useContext(GlobalStateContext);
    var textInputStyle = [styles.searchInput, interfaceLanguage === "hebrew" ? styles.hebrewSystemFont : null, theme.text];
    //TODO sorry for the hard-coded colors. because the prop placeholderTextColor of TextInput doesn't take a style and instead requires an explicit color string, I had to do it this way
    var placeholderTextColor = themeStr == "black" ? "#BBB" : "#777";
    //TODO make flex dependent on results. animate opening of results
    return (
      <View style={{flexDirection: 'column', flex:0}}>
        <View style={[styles.header, theme.header]}>
          {this.props.leftMenuButton == "close" ?
            <CloseButton onPress={onBack} /> :
            <DirectedButton
              onPress={onBack}
              imageStyle={[styles.menuButton, styles.directedButton]}
              language="english"
              direction="back"/>
          }
          { this.props.hideSearchButton ? null :
            <SearchButton onPress={submitSearch} />
          }
          <TextInput
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
            <CancelButton onPress={() => { onChange(""); }} />
            : null
          }
          {this.props.toggleLanguage ?
            <LanguageToggleButton
              toggleLanguage={toggleLanguage}
              language={menuLanguage}
            />
             : null}
        </View>
      </View>
    );
  }
}
SearchBar.propTypes = {
  onBack:          PropTypes.func.isRequired,
  search:          PropTypes.func.isRequired,
  setIsNewSearch:  PropTypes.func.isRequired,
  searchType:      PropTypes.oneOf(['text', 'sheet']).isRequired,
  toggleLanguage:  PropTypes.func,
  language:        PropTypes.string,
  hideSearchButton:PropTypes.bool,
  query:           PropTypes.string.isRequired,
  onChange:        PropTypes.func.isRequired,
  onFocus:         PropTypes.func,
};

const CancelButton = ({ onPress }) => (
  <GlobalStateContext.Consumer>
    { ({ themeStr }) => (
      <TouchableOpacity onPress={onPress}>
        <Image
          source={themeStr === 'white' ? require('./img/circle-close.png') : require('./img/circle-close-light.png')}
          style={styles.cancelSearchButton}
          resizeMode={'contain'}
        />
      </TouchableOpacity>
    )}
  </GlobalStateContext.Consumer>
);

export default SearchBar;
