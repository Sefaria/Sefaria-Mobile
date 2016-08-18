'use strict';
import React, { Component } from 'react';
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
    onQueryChange:   React.PropTypes.func.isRequired
  },
  getInitialState: function() {
    return {text: "Search"};
  },
  render: function() {
    return (
      <View style={styles.header}>
        <CloseButton onPress={this.props.closeNav} />
        <TextInput
          style={styles.searchInput}
          onChangeText={(text) => this.setState({text})}
          onSubmitEditing={(event) => this.props.onQueryChange(event.nativeEvent.text,true)}
          value={this.state.text}/>
      </View>
    );
  }
});

module.exports = SearchBar;