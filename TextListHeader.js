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
  TripleDots
} = require('./Misc.js');

const styles  = require('./Styles');
const strings = require('./LocalizedStrings');


class TextListHeader extends React.Component {
  static propTypes = {
    Sefaria:        PropTypes.object.isRequired,
    theme:          PropTypes.object.isRequired,
    updateCat:      PropTypes.func.isRequired,
    closeCat:       PropTypes.func.isRequired,
    category:       PropTypes.string,
    filterIndex:    PropTypes.number,
    recentFilters:  PropTypes.array,
    language:       PropTypes.oneOf(["english","hebrew","bilingual"]),
    connectionsMode:PropTypes.string,
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
    switch (this.props.connectionsMode) {
      case ('filter'):
        var viewList = this.props.recentFilters.map((filter, i)=>{
          return (<TextListHeaderItem
                    theme={this.props.theme}
                    language={this.props.language}
                    filter={filter}
                    filterIndex={i}
                    selected={i == this.props.filterIndex}
                    updateCat={this.props.updateCat}
                    key={i} />
              );
        });
        return (
          <View style={[styles.textListHeader, this.props.theme.textListHeader, style]}>
            <ScrollView style={styles.textListHeaderScrollView} horizontal={true}>{viewList}</ScrollView>
            <TripleDots onPress={this.props.closeCat} themeStr={this.props.themeStr}/>
           </View>
        );
      default:
        return (<View style={[styles.textListHeader, styles.textListHeaderSummary, this.props.theme.textListHeader]}>
                  <Text style={[styles.textListHeaderSummaryText, this.props.theme.textListHeaderSummaryText]}>{strings.resources}</Text>
                </View>);
    }
  }
}

class TextListHeaderItem extends React.Component {
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
    var textStyles = [styles.textListHeaderItemText, this.props.theme.textListHeaderItemText];

      if (this.props.selected) {
        textStyles.push(this.props.theme.textListHeaderItemSelected);
      }
    return (
      <TouchableOpacity style={styles.textListHeaderItem} onPress={()=>{this.props.updateCat(null, this.props.filterIndex)}}>
        <Text style={textStyles}>{filterStr}</Text>
      </TouchableOpacity>
      );
  }
}

module.exports = TextListHeader;
