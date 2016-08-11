'use strict';
var React = require('react-native');

var {
  TouchableOpacity,
  Text,
  View,
  TextInput
} = React;

var styles = require('./Styles.js');


var SearchBar = React.createClass({
  getInitialState: function() {
    return {text: "Search"};
  },
  propTypes:{
    closeNav:        React.PropTypes.func.isRequired,
    onQueryChange:   React.PropTypes.func.isRequired
  },
  render: function() {
    return (
      <View style={styles.header}>
        <TouchableOpacity onPress={this.props.closeNav}>
            <Text style={styles.headerButton}>X</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          onChangeText={(text) => this.setState({text})}
          onSubmitEditing={(event) => this.props.onQueryChange(event.nativeEvent.text)}
          value={this.state.text}/>
      </View>
    );
  }
});

module.exports = SearchBar;