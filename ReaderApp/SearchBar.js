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
  SearchButton
} = require('./Misc.js');

var styles = require('./Styles.js');


var SearchBar = React.createClass({
  propTypes:{
    closeNav:        React.PropTypes.func.isRequired,
    onQueryChange:   React.PropTypes.func.isRequired,
    setIsNewSearch:  React.PropTypes.func.isRequired,
    query:           React.PropTypes.string
  },
  getInitialState: function() {
    var init_text = this.props.query ? this.props.query : "Search";
    return {text: init_text};
  },
  render: function() {

    return (
      <View style={styles.header}>
        <CloseButton onPress={this.props.closeNav} />
        <TextInput
          style={styles.searchInput}
          onFocus= {() => this.setState({text : ''})}
          onChangeText={(text) => this.setState({text})}
          onSubmitEditing={(event) => {
            this.props.setIsNewSearch(true);
            this.props.onQueryChange(event.nativeEvent.text,true);
          }}
          value={this.state.text}/>
      </View>
    );
  }
});

module.exports = SearchBar;