'use strict';
import PropTypes from 'prop-types';
import React, {Component} from 'react';

import {
  TouchableOpacity,
  Text,
  View,
  TextInput
} from 'react-native';

import {
  DirectedButton,
  CloseButton,
  SearchButton,
  LanguageToggleButton,
} from './Misc.js';

import AutocompleteList from './AutocompleteList';

import styles from './Styles';
import strings from './LocalizedStrings';

class SearchBar extends React.Component {
  static propTypes = {
    interfaceLang:       PropTypes.oneOf(["english", "hebrew"]).isRequired,
    theme:           PropTypes.object.isRequired,
    themeStr:        PropTypes.string.isRequired,
    closeNav:        PropTypes.func.isRequired,
    onQueryChange:   PropTypes.func.isRequired,
    setIsNewSearch:  PropTypes.func.isRequired,
    toggleLanguage:  PropTypes.func,
    language:        PropTypes.string,
    query:           PropTypes.string.isRequired,
    onChange:        PropTypes.func.isRequired,
    openRef:         PropTypes.func.isRequired,
    openTextTocDirectly: PropTypes.func.isRequired,
    setCategories:   PropTypes.func.isRequired,
  };

  submitSearch = () => {
    if (this.props.query) {
      this.props.setIsNewSearch(true);
      this.props.onQueryChange(this.props.query, true, false, true);
    }
  };
  onFocus = () => {
    if (this.autocompleteRef) {
      this.autocompleteRef.onQueryChange(this.props.query);
    }
  }
  _getAutocompleteRef = ref => {
    this.autocompleteRef = ref;
  }

  render() {
    var textInputStyle = [styles.searchInput, this.props.interfaceLang === "hebrew" ? styles.hebrewSystemFont : null, this.props.theme.text];
    //TODO sorry for the hard-coded colors. because the prop placeholderTextColor of TextInput doesn't take a style and instead requires an explicit color string, I had to do it this way
    var placeholderTextColor = this.props.themeStr == "black" ? "#BBB" : "#777";

    //TODO make flex dependent on results. animate opening of results
    return (
      <View style={{flexDirection: 'column', flex:0}}>
        <View style={[styles.header, this.props.theme.header]}>
          {this.props.leftMenuButton == "close" ?
            <CloseButton onPress={this.props.closeNav} theme={this.props.theme} themeStr={this.props.themeStr} /> :
            <DirectedButton
              onPress={this.props.openNav}
              themeStr={this.props.themeStr}
              imageStyle={[styles.menuButton, styles.directedButton]}
              language="english"
              direction="back"/>
          }
          <SearchButton onPress={this.submitSearch} theme={this.props.theme} themeStr={this.props.themeStr} />
          <TextInput
            style={textInputStyle}
            onChangeText={this.props.onChange}
            onSubmitEditing={this.submitSearch}
            onFocus={this.onFocus}
            value={this.props.query}
            placeholder={strings.search}
            placeholderTextColor={placeholderTextColor}
            autoCorrect={false} />
          {this.props.toggleLanguage ?
            <LanguageToggleButton
              theme={this.props.theme}
              toggleLanguage={this.props.toggleLanguage}
              language={this.props.language}
              themeStr={this.props.themeStr}
            />
             : null}
        </View>
        <AutocompleteList
          theme={this.props.theme}
          themeStr={this.props.themeStr}
          ref={this._getAutocompleteRef}
          query={this.props.query}
          openRef={this.props.openRef}
          openTextTocDirectly={this.props.openTextTocDirectly}
          setCategories={this.props.setCategories}
        />
      </View>
    );
  }
}

export default SearchBar;
