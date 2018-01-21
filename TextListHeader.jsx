'use strict';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView
} from 'react-native';

var {
  CategoryColorLine,
  TripleDots,
  DirectedButton,
} = require('./Misc.js');

const styles  = require('./Styles');
const strings = require('./LocalizedStrings');


class TextListHeader extends React.Component {
  static propTypes = {
    Sefaria:            PropTypes.object.isRequired,
    theme:              PropTypes.object.isRequired,
    themeStr:           PropTypes.string.isRequired,
    interfaceLang:      PropTypes.oneOf(["english", "hebrew"]).isRequired,
    setConnectionsMode: PropTypes.func.isRequired,
    closeCat:           PropTypes.func.isRequired,
    category:           PropTypes.string,
    filterIndex:        PropTypes.number,
    recentFilters:      PropTypes.array,
    language:           PropTypes.oneOf(["english","hebrew","bilingual"]),
    connectionsMode:    PropTypes.string,
  };

  constructor(props) {
    super(props);
    Sefaria = props.Sefaria;
    this.previousModes = { // mapping from modes to previous modes
      "Version Open":"Versions"
    };
  }

  render() {
    var style = {"borderTopColor": Sefaria.palette.categoryColor(this.props.category)};
    let content;
    let outerStyles;
    switch (this.props.connectionsMode) {
      case (null):
        // summary
        outerStyles = [styles.textListHeader, styles.textListHeaderSummary, this.props.theme.textListHeader];
        content = (
          <Text style={[styles.textListHeaderSummaryText, this.props.theme.textListHeaderSummaryText]}>{strings.resources}</Text>
        );
        break;
      default:
        // category or book filter selected
        const isheb = this.props.interfaceLang === "hebrew";
        const backImageStyle = isheb ? styles.directedButtonWithTextHe : styles.directedButtonWithTextEn;
        const selectedFilter = this.props.recentFilters[this.props.filterIndex];
        const isInFilter = this.props.connectionsMode === 'filter';
        const backText =  isInFilter ?
          (this.props.language === "hebrew" ?
            (Sefaria.hebrewCategory(selectedFilter.category)) : selectedFilter.category
          ) : strings.resources;
        outerStyles = [styles.textListHeader, styles.textListHeaderSummary, this.props.theme.textListHeader];
        content = (
          <View style={{flex: 1, flexDirection: isheb ? 'row-reverse' : 'row', justifyContent: 'flex-start' }}>
            <DirectedButton
              text={backText}
              themeStr={this.props.themeStr}
              language={this.props.interfaceLang}
              textStyle={[this.props.theme.textListHeaderSummaryText]}
              imageStyle={[styles.menuButton, backImageStyle]}
              onPress={()=> { isInFilter ? this.props.setConnectionsMode(selectedFilter.category) : this.props.closeCat(); }}
              direction={"back"}
            />
          </View>
        );
        break;
    }
    return (
      <View style={outerStyles}>
        { content }
     </View>
   );
  }
}

module.exports = TextListHeader;
