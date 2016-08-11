'use strict';

var React = require('react-native');
var Sefaria = require('./sefaria');

var {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} = React;

var styles = require('./Styles.js');


var TwoBox = React.createClass({
    propTypes: {
        content: React.PropTypes.array.isRequired
    },
    render: function() {
        var content = this.props.content.map(function(item) {
            return (<View styles={styles.twoBoxChild}>{item}</View>);
        });
        return (<View styles={styles.twoBox}>{content}</View>);
    }
});


var CategoryColorLine = React.createClass({
  render: function() {
    var style = {backgroundColor: Sefaria.palette.categoryColor(this.props.category)};
    return (<View style={[styles.categoryColorLine, style]}></View>);
  }
});


var LanguageToggleButton = React.createClass({
  propTypes: {
    language:       React.PropTypes.string.isRequired,
    toggleLanguage: React.PropTypes.func.isRequired
  },
  render: function() {
    var content = this.props.language == "hebrew" ? 
        (<Text>A</Text>) : (<Text>א</Text>);
    return (<View style={styles.languageToggle}>
              <TouchableOpacity onPress={this.props.toggleLanguage}>
                {content}
              </TouchableOpacity>
            </View>);
  }
});


module.exports.TwoBox = TwoBox;
module.exports.CategoryColorLine = CategoryColorLine;
module.exports.LanguageToggleButton = LanguageToggleButton;
