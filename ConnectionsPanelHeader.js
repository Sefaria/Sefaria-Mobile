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
  DirectedArrow,
} = require('./Misc.js');

const styles  = require('./Styles');
const strings = require('./LocalizedStrings');


class ConnectionsPanelHeader extends React.Component {
  static propTypes = {
    theme:              PropTypes.object.isRequired,
    themeStr:           PropTypes.string.isRequired,
    settings:           PropTypes.object.isRequired,
    interfaceLang:      PropTypes.oneOf(["english", "hebrew"]).isRequired,
    setConnectionsMode: PropTypes.func.isRequired,
    closeCat:           PropTypes.func.isRequired,
    updateCat:          PropTypes.func.isRequired,
    category:           PropTypes.string,
    filterIndex:        PropTypes.number,
    recentFilters:      PropTypes.array,
    language:           PropTypes.oneOf(["english","hebrew","bilingual"]),
    connectionsMode:    PropTypes.string,
  };

  constructor(props) {
    super(props);
    this.previousModes = { // mapping from modes to previous modes
      "Version Open":"Versions"
    };
  }

  render() {
    var style = {"borderTopColor": Sefaria.palette.categoryColor(this.props.category)};
    let content;
    let outerStyles;
    const isheb = this.props.interfaceLang === "hebrew";
    const backImageStyle = isheb ? styles.directedButtonWithTextHe : styles.directedButtonWithTextEn;
    const selectedFilter = this.props.recentFilters[this.props.filterIndex];
    switch (this.props.connectionsMode) {
      case (null):
        // summary
        outerStyles = [styles.textListHeader, styles.textListHeaderSummary, this.props.theme.textListHeader];
        content = (
          <Text style={[styles.textListHeaderSummaryText, this.props.theme.textListHeaderSummaryText]}>{strings.resources}</Text>
        );
        break;
      case 'filter':
        outerStyles = [styles.textListHeader, styles.textListHeaderSummary, this.props.theme.textListHeader];
        content = (
          <View style={{flex: 1, flexDirection: isheb ? 'row-reverse' : 'row', justifyContent: 'flex-start' }}>
            <TouchableOpacity onPress={() => {this.props.setConnectionsMode(selectedFilter.category)}}>
              <DirectedArrow
                imageStyle={backImageStyle}
                themeStr={this.props.themeStr}
                language={this.props.interfaceLang}
                direction={"back"}
              />
            </TouchableOpacity>
            <ScrollView style={styles.textListHeaderScrollView} horizontal={true}>
              <RecentFilterNav
                theme={this.props.theme}
                recentFilters={this.props.recentFilters}
                filterIndex={this.props.filterIndex}
                updateCat={this.props.updateCat}
                language={this.props.settings.language}
              />
            </ScrollView>
          </View>
        );
        break;
      default:
        // category or book filter selected
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
            key={filter.title + "|" + filter.category}
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
    var filterStr = this.props.language == "hebrew" ?
      (this.props.filter.heCollectiveTitle ? this.props.filter.heCollectiveTitle : this.props.filter.heTitle) : //NOTE backwards compatibility
      (this.props.filter.collectiveTitle ? this.props.filter.collectiveTitle : this.props.filter.title);

    const touchStyles = [styles.connectionsPanelHeaderItem];
    var textStyles = [styles.connectionsPanelHeaderItemText, this.props.theme.connectionsPanelHeaderItemText, this.props.language == "hebrew" ? styles.hebrewText : styles.englishText];
    if (this.props.selected) {
      textStyles.push(this.props.theme.connectionsPanelHeaderItemTextSelected);
    }
    return (
      <TouchableOpacity
        style={touchStyles}
        onPress={()=>{this.props.updateCat(null, this.props.filterIndex)}}
      >
        <Text style={textStyles}>{filterStr}</Text>
      </TouchableOpacity>
      );
  }
}

module.exports = ConnectionsPanelHeader;
