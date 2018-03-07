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
    query:           PropTypes.string
  };

  state = {text: this.props.query || ""};

  submitSearch = () => {
    if (this.state.text) {
      this.props.setIsNewSearch(true);
      this.props.onQueryChange(this.state.text, true, false, true);
    }
  };

  render() {
    var textInputStyle = [styles.searchInput, this.props.interfaceLang === "hebrew" ? styles.hebrewSystemFont : null, this.props.theme.text];
    if (this.state.text == "") {
      //textInputStyle = textInputStyle.concat([styles.searchInputPlaceholder]);
    }
    //TODO sorry for the hard-coded colors. because the prop placeholderTextColor of TextInput doesn't take a style and instead requires an explicit color string, I had to do it this way
    var placeholderTextColor = this.props.themeStr == "black" ? "#BBB" : "#777";
    return (
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
          onChangeText={(text) => this.setState({text})}
          onSubmitEditing={this.submitSearch}
          value={this.state.text}
          placeholder={strings.search}
          placeholderTextColor={placeholderTextColor} />
        {this.props.toggleLanguage ?
          <LanguageToggleButton
            theme={this.props.theme}
            toggleLanguage={this.props.toggleLanguage}
            language={this.props.language}
            themeStr={this.props.themeStr}
          />
           : null}
      </View>
    );
  }
}

export default SearchBar;
