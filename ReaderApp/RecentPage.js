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
  GoBackButton,
  TwoBox,
  LanguageToggleButton
} = require('./Misc.js');

const styles           = require('./Styles');
const strings          = require('./LocalizedStrings');

var {
  CategoryColorLine,
} = require('./Misc.js');

class RecentPage extends React.Component {
  static propTypes = {
    close:              React.PropTypes.func.isRequired,
    theme:              React.PropTypes.object.isRequired,
    themeStr:           React.PropTypes.string.isRequired,
    toggleLanguage:     React.PropTypes.func.isRequired,
    openRef:            React.PropTypes.func.isRequired,
    language:           React.PropTypes.oneOf(["english","hebrew"]),
    Sefaria:            React.PropTypes.object.isRequired
  };

  render() {
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
          <GoBackButton onPress={this.props.close} theme={this.props.theme} themeStr={this.props.themeStr}/>
          <Text style={[styles.textTocHeaderTitle, styles.textCenter, this.props.theme.text]}>{strings.recent.toUpperCase()}</Text>
          <LanguageToggleButton
            theme={this.props.theme}
            toggleLanguage={this.props.toggleLanguage}
            language={this.props.language}
            themeStr={this.props.themeStr}
          />
        </View>

        <ScrollView style={styles.menuContent}>
          <View style={styles.readerNavSection}>
            <TwoBox content={recent} language={this.props.language}/>
          </View>
        </ScrollView>
      </View>
    );
  }
}

module.exports = RecentPage;
