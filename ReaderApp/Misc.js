'use strict';

import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicatorIOS
} from 'react-native';

var Sefaria = require('./sefaria');

var styles = require('./Styles.js');


var TwoBox = React.createClass({
    propTypes: {
        content: React.PropTypes.array.isRequired
    },
    render: function() {
        var content = this.props.content.map(function(item, i) {
            return (<View style={styles.twoBoxItem} key={i}>{item}</View>);
        });
        var rows = [];
        for (var i=0; i < content.length; i += 2) {
            if (content.length > i+1) {
              var items = [content[i], content[i+1]];
            } else {
              var items = [content[i]];
            }
            rows.push(<View style={styles.twoBoxRow} key={i}>{items}</View>);
        }
        return (<View style={styles.twoBox}>{rows}</View>);
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
    return (<TouchableOpacity style={styles.languageToggle} onPress={this.props.toggleLanguage}>
              {content}
            </TouchableOpacity>);
  }
});


var SearchButton = React.createClass({
  render: function() { 
    return (<TouchableOpacity style={[styles.headerButton]} onPress={this.props.onPress}>
              <Text style={styles.searchButton}>🔎</Text>
            </TouchableOpacity>);
  }
});


var MenuButton = React.createClass({
  render: function() {
    return (<TouchableOpacity style={[styles.headerButton]} onPress={this.props.onPress}>
              <Text style={styles.menuButton}>☰</Text>
            </TouchableOpacity>);
  }
});


var CloseButton = React.createClass({
  render: function() {
    return (<TouchableOpacity style={[styles.headerButton]} onPress={this.props.onPress}>
              <Text style={styles.closeButton}>×</Text>
            </TouchableOpacity>);
  }
});


var DisplaySettingsButton = React.createClass({
  render: function() { 
    return (<TouchableOpacity style={[styles.headerButton]} onPress={this.props.onPress}>
              <Image source={require('./img/ayealeph.png')} 
                     style={styles.displaySettingsButton} 
                     resizeMode={Image.resizeMode.contain} />
            </TouchableOpacity>);
  }
});


var LoadingView = React.createClass({
    render: function() {
      return ( <View style={styles.container}>
                  <ActivityIndicatorIOS
                    animating={true}
                    style={[styles.centering, {height: 80}]}
                    size="large" />
               </View> );
    }
});

module.exports.TwoBox = TwoBox;
module.exports.CategoryColorLine = CategoryColorLine;
module.exports.LanguageToggleButton = LanguageToggleButton;
module.exports.SearchButton = SearchButton;
module.exports.MenuButton = MenuButton;
module.exports.CloseButton = CloseButton;
module.exports.DisplaySettingsButton = DisplaySettingsButton;
module.exports.LoadingView = LoadingView;
