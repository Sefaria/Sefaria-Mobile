'use strict';

var React = require('react-native');

var {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} = React;

var styles = require('./Styles.js');

var SearchPage = React.createClass({
	propTypes: {
		closeNav: React.PropTypes.func.isRequired
	},
	render: function() {
		return (<View style={[styles.container, styles.menu]}>
              <Text>SearchPage!!</Text>
              <Text onPress={this.props.closeNav}>close</Text>
            </View>);
	}
});

module.exports = SearchPage;