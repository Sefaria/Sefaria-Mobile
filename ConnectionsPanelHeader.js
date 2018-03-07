'use strict';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView
} from 'react-native';

import {
  CategoryColorLine,
  TripleDots,
  DirectedButton,
  DirectedArrow,
} from './Misc.js';

import styles from './Styles';
import strings from './LocalizedStrings';


class ConnectionsPanelHeader extends React.Component {
  static propTypes = {
    theme:              PropTypes.object.isRequired,
    themeStr:           PropTypes.string.isRequired,
    menuLanguage:       PropTypes.oneOf(["english", "hebrew"]).isRequired,
    interfaceLang:      PropTypes.oneOf(["english", "hebrew"]).isRequired,
    setConnectionsMode: PropTypes.func.isRequired,
    closeCat:           PropTypes.func.isRequired,
    updateCat:          PropTypes.func,
    category:           PropTypes.string,
    filterIndex:        PropTypes.number,
    recentFilters:      PropTypes.array,
    connectionsMode:    PropTypes.string,
  };

  constructor(props) {
    super(props);
    this.previousModes = { // mapping from modes to previous modes
      "version open": "versions",
    };
  }

  render() {
    var style = {"borderTopColor": Sefaria.palette.categoryColor(this.props.category)};
    let content;
    let outerStyles;
    const isheb = this.props.interfaceLang === "hebrew";
    const backImageStyle = isheb ? styles.directedButtonWithTextHe : styles.directedButtonWithTextEn;
    switch (this.props.connectionsMode) {
      case (null):
        // summary
        outerStyles = [styles.textListHeader, styles.textListHeaderSummary, this.props.theme.textListHeader, {flexDirection: isheb ? 'row-reverse' : 'row'}];
        content = (
          <Text style={[isheb ? styles.heInt : styles.enInt, this.props.theme.textListHeaderSummaryText]}>{strings.resources}</Text>
        );
        break;
      case 'version open': // fall-through
      case 'filter':
        const selectedFilter = this.props.recentFilters[this.props.filterIndex];
        const backMode = this.props.connectionsMode === 'filter' ? selectedFilter.category : this.previousModes[this.props.connectionsMode];
        outerStyles = [styles.textListHeader, styles.textListHeaderSummary, this.props.theme.textListHeader];
        content = (
          <View style={{flex: 1, flexDirection: isheb ? 'row-reverse' : 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => {this.props.setConnectionsMode(backMode)}}>
              <DirectedArrow
                imageStyle={backImageStyle}
                themeStr={this.props.themeStr}
                language={this.props.interfaceLang}
                direction={"back"}
              />
            </TouchableOpacity>
            <ScrollView style={{flexDirection: isheb ? 'row-reverse' : 'row'}} contentContainerStyle={styles.textListHeaderScrollView} horizontal={true}>
              <RecentFilterNav
                theme={this.props.theme}
                recentFilters={this.props.recentFilters}
                filterIndex={this.props.filterIndex}
                updateCat={this.props.updateCat}
                language={this.props.menuLanguage}
              />
            </ScrollView>
          </View>
        );
        break;
      default:
        // category filter selected
        const backText = strings.resources;
        outerStyles = [styles.textListHeader, styles.textListHeaderSummary, this.props.theme.textListHeader];
        content = (
          <View style={{flex: 1, flexDirection: isheb ? 'row-reverse' : 'row', justifyContent: 'flex-start' }}>
            <DirectedButton
              text={backText}
              themeStr={this.props.themeStr}
              language={this.props.interfaceLang}
              textStyle={[isheb ? styles.heInt : styles.enInt, this.props.theme.textListHeaderSummaryText]}
              imageStyle={[styles.menuButton, backImageStyle]}
              onPress={()=> { this.props.closeCat(); }}
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

class RecentFilterNav extends React.Component {
  static propTypes = {
    theme:          PropTypes.object.isRequired,
    updateCat:      PropTypes.func.isRequired,
    recentFilters:  PropTypes.array,
    filterIndex:    PropTypes.number,
    language:       PropTypes.oneOf(["english","hebrew","bilingual"]),
  }

  render() {
    return (
      <View style={{flexDirection: this.props.language === "hebrew" ? 'row-reverse' : 'row', justifyContent: 'flex-start'}}>
        { this.props.recentFilters.map((filter, i) =>
          <RecentFilterNavItem
            theme={this.props.theme}
            language={this.props.language}
            updateCat={this.props.updateCat}
            filter={filter}
            filterIndex={i}
            selected={i === this.props.filterIndex}
            key={filter.listKey()}
          />
        )}
      </View>
    );
  }
}

class RecentFilterNavItem extends React.Component {
  static propTypes = {
    theme:          PropTypes.object.isRequired,
    updateCat:      PropTypes.func.isRequired,
    filter:         PropTypes.object,
    filterIndex:    PropTypes.number,
    language:       PropTypes.oneOf(["english","hebrew","bilingual"]),
    selected:       PropTypes.bool
  };

    render() {
      var filterStr = this.props.filter.toString(this.props.language);

      const touchStyles = [styles.connectionsPanelHeaderItem];
      var textStyles = [styles.connectionsPanelHeaderItemText, this.props.theme.connectionsPanelHeaderItemText, this.props.language == "hebrew" ? styles.hebrewText : styles.englishText];
      if (this.props.selected) {
        textStyles.push(this.props.theme.connectionsPanelHeaderItemTextSelected);
      }
      // dont disable because that makes it hard to scroll disabled={this.props.selected}
      return (
        <TouchableOpacity
          style={touchStyles}
          onPress={()=>{this.props.updateCat(this.props.filterIndex)}}
        >
          <Text style={textStyles}>{filterStr}</Text>
        </TouchableOpacity>
        );
    }
}

export default ConnectionsPanelHeader;
