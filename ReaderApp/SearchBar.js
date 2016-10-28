'use strict';
import React, {Component} from 'react';

import {
  TouchableOpacity,
  Text,
  View,
  TextInput
} from 'react-native';

var {
  CloseButton,
  SearchButton,
  LanguageToggleButton,
} = require('./Misc.js');

var styles = require('./Styles.js');


var SearchBar = React.createClass({
  propTypes:{
    theme:           React.PropTypes.object.isRequired,
    closeNav:        React.PropTypes.func.isRequired,
    onQueryChange:   React.PropTypes.func.isRequired,
    setIsNewSearch:  React.PropTypes.func.isRequired,
    toggleLanguage:  React.PropTypes.func,
    language:        React.PropTypes.string,
    query:           React.PropTypes.string
  },
  getInitialState: function() {
    return {text: this.props.query || ""};
  },
  submitSearch: function() {
    if (this.state.text) {
      this.props.setIsNewSearch(true);
      this.props.onQueryChange(this.state.text, true);
    }
  },
  render: function() {
    var textInputStyle = [styles.searchInput, this.props.theme.text];
    if (this.state.text == "") { 
      textInputStyle = textInputStyle.concat([styles.searchInputPlaceholder, this.props.theme.searchInputPlaceholder]);
    }
    
    return (
      <View style={[styles.header, this.props.theme.header]}>
        <CloseButton onPress={this.props.closeNav} theme={this.props.theme}/>
        <SearchButton onPress={this.submitSearch} theme={this.props.theme}/>
        <TextInput
          style={textInputStyle}
          onChangeText={(text) => this.setState({text})}
          onSubmitEditing={this.submitSearch}
          value={this.state.text} 
          placeholder={"Search"} />
        {this.props.toggleLanguage ? 
          <LanguageToggleButton 
            theme={this.props.theme} 
            toggleLanguage={this.props.toggleLanguage} 
            language={this.props.language}
            margin={true} />
           : null}
      </View>
    );
  }
});

module.exports = SearchBar;
