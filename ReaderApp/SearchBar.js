'use strict';
import React, {Component} from 'react';

import {
  TouchableOpacity,
  Text,
  View,
  TextInput
} from 'react-native';

var {
  GoBackButton,
  CloseButton,
  SearchButton,
  LanguageToggleButton,
} = require('./Misc.js');

const styles  = require('./Styles');
const strings = require('./LocalizedStrings');

class SearchBar extends React.Component {
  static propTypes = {
    theme:           React.PropTypes.object.isRequired,
    themeStr:        React.PropTypes.string.isRequired,
    closeNav:        React.PropTypes.func.isRequired,
    onQueryChange:   React.PropTypes.func.isRequired,
    setIsNewSearch:  React.PropTypes.func.isRequired,
    toggleLanguage:  React.PropTypes.func,
    language:        React.PropTypes.string,
    query:           React.PropTypes.string
  };

  state = {text: this.props.query || ""};

  submitSearch = () => {
    if (this.state.text) {
      this.props.setIsNewSearch(true);
      this.props.onQueryChange(this.state.text, true);
    }
  };

  render() {
    var textInputStyle = [styles.searchInput, this.props.theme.text];
    if (this.state.text == "") {
      //textInputStyle = textInputStyle.concat([styles.searchInputPlaceholder]);
    }
    //TODO sorry for the hard-coded colors. because the prop placeholderTextColor of TextInput doesn't take a style and instead requires an explicit color string, I had to do it this way
    var placeholderTextColor = this.props.themeStr == "black" ? "#BBB" : "#777";
    return (
      <View style={[styles.header, this.props.theme.header]}>
        {this.props.leftMenuButton == "close" ?  <CloseButton onPress={this.props.closeNav} theme={this.props.theme} themeStr={this.props.themeStr} /> : <GoBackButton onPress={this.props.openNav} theme={this.props.theme} themeStr={this.props.themeStr} /> }
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

module.exports = SearchBar;
