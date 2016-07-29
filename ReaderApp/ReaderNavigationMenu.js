'use strict';

var React = require('react-native');

var {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} = React;

var styles = require('./Styles.js');


var ReaderNavigationMenu = React.createClass({
  // The Navigation menu for browsing and searching texts
  propTypes: {
    //categories:    React.PropTypes.array.isRequired,
    //settings:      React.PropTypes.object.isRequired,
    //setCategories: React.PropTypes.func.isRequired,
    //setOption:     React.PropTypes.func.isRequired,
    closeNav:      React.PropTypes.func.isRequired,
    openNav:       React.PropTypes.func.isRequired,
    //openSearch:    React.PropTypes.func.isRequired,
    //onTextClick:   React.PropTypes.func.isRequired,
    //onRecentClick: React.PropTypes.func.isRequired,
    //closePanel:    React.PropTypes.func,
    //hideNavHeader: React.PropTypes.bool,
    //multiPanel:    React.PropTypes.bool,
    //home:          React.PropTypes.bool,
    //compare:       React.PropTypes.bool
  },
  getInitialState: function() {
    return {
      showMore: false,
    };
  },
  render: function() {
    return (<View style={[styles.container, styles.menu]}>
              <Text>Navigation!!</Text>
              <Text onPress={this.props.closeNav}>close</Text>
            </View>);
  }
});


module.exports = ReaderNavigationMenu;