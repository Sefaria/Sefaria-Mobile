'use strict';
var React = require('react-native');
var HTMLView = require('./node_modules/react-native-htmlview/HTMLView');

//        <Text style={this.props.textType == "hebrew" ? styles.hebrewText : styles.englishText}>{this.props.text}</Text>

var {
  View,
  Text
} = React;

var styles = require('./Styles.js');

var SearchTextResult = React.createClass({
  propTypes: {
    text: React.PropTypes.string,
    title: React.PropTypes.string,
    textType: React.PropTypes.string,
  },
  render: function() {
    return (
      <View style={styles.searchTextResult}>
        <Text>{this.props.title}</Text>
        <HTMLView value={this.props.text}/>
      </View>
    );
  }
});

module.exports = SearchTextResult;