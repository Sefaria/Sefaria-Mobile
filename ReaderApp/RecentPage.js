'use strict';

import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ScrollView,
  Alert
} from 'react-native';
var {
  CategoryColorLine,
  CategoryBlockLink,
  CloseButton,
  TwoBox,
  ButtonToggleSet,
  CategoryBlockLink
} = require('./Misc.js');

const styles           = require('./Styles');
const strings          = require('./LocalizedStrings');

var {
  CategoryColorLine,
} = require('./Misc.js');

var RecentPage = React.createClass({
  propTypes: {
    close:              React.PropTypes.func.isRequired,
    theme:              React.PropTypes.object.isRequired,
    themeStr:           React.PropTypes.string.isRequired,
    toggleMenuLanguage: React.PropTypes.func.isRequired,
    openRef:            React.PropTypes.func.isRequired,
    Sefaria:            React.PropTypes.object.isRequired
  },

  render: function() {
    var recent = Sefaria.recent.map(function(item) {
      return (<CategoryBlockLink
                    theme={this.props.theme}
                    category={item.ref}
                    heCat={item.heRef}
                    language={this.props.language}
                    style={{"borderColor": Sefaria.palette.categoryColor(item.category)}}
                    onPress={this.props.openRef.bind(null, item.ref)}
                    key={item.ref} />);
    }.bind(this));

    return (
      <View style={[styles.menu, this.props.theme.menu]}>
        <CategoryColorLine category={"Other"} />
        <View style={[styles.header, this.props.theme.header]}>
          <CloseButton onPress={this.props.close} theme={this.props.theme} themeStr={this.props.themeStr}/>
          <Text style={[styles.settingsHeader, this.props.theme.text]}>{strings.recent.toUpperCase()}</Text>
        </View>

        <ScrollView style={styles.menuContent}>
          <View style={styles.readerNavSection}>
            <TwoBox content={recent} language={"english"}/>
          </View>
        </ScrollView>
      </View>
    );
  }
});

module.exports = RecentPage;
