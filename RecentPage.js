'use strict';

import PropTypes from 'prop-types';

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
import {
  CategoryColorLine,
  CategoryBlockLink,
  DirectedButton,
  TwoBox,
  LanguageToggleButton
} from './Misc.js';

import styles from './Styles';
import strings from './LocalizedStrings';

class RecentPage extends React.Component {
  static propTypes = {
    close:              PropTypes.func.isRequired,
    theme:              PropTypes.object.isRequired,
    themeStr:           PropTypes.string.isRequired,
    toggleLanguage:     PropTypes.func.isRequired,
    openRef:            PropTypes.func.isRequired,
    language:           PropTypes.oneOf(["english","hebrew"]),
    Sefaria:            PropTypes.object.isRequired
  };

  render() {
    var recent = Sefaria.recent.map(function(item) {
      return (<CategoryBlockLink
                    theme={this.props.theme}
                    category={item.ref}
                    heCat={item.heRef}
                    language={this.props.language}
                    style={{"borderColor": Sefaria.palette.categoryColor(item.category)}}
                    onPress={this.props.openRef.bind(null, item.ref, null, item.versions)}
                    key={item.ref} />);
    }.bind(this));

    return (
      <View style={[styles.menu, this.props.theme.menu]}>
        <CategoryColorLine category={"Other"} />
        <View style={[styles.header, this.props.theme.header]}>
          <DirectedButton
            onPress={this.props.close}
            themeStr={this.props.themeStr}
            imageStyle={[styles.menuButton, styles.directedButton]}
            direction="back"
            language="english"/>
          <Text style={[styles.textTocHeaderTitle, styles.textCenter, this.props.theme.text]}>{strings.recent.toUpperCase()}</Text>
          <LanguageToggleButton
            theme={this.props.theme}
            toggleLanguage={this.props.toggleLanguage}
            language={this.props.language}
            themeStr={this.props.themeStr}
          />
        </View>

        <ScrollView contentContainerStyle={styles.menuContent}>
          <View style={styles.readerNavSection}>
            <TwoBox content={recent} language={this.props.language}/>
          </View>
        </ScrollView>
      </View>
    );
  }
}

export default RecentPage;
