'use strict';

import React, { Component } from 'react';
import {
  Text,
  TouchableOpacity,
  View
} from 'react-native';
var styles = require('./Styles.js');


var ReaderDisplayOptionsMenu = React.createClass({
  propTypes: {
    textFlow:                        React.PropTypes.string,
    textReference:                   React.PropTypes.string,
    columnLanguage:                  React.PropTypes.string,
    ReaderDisplayOptionsMenuVisible: React.PropTypes.bool,
    openNav:                         React.PropTypes.function,
    toggleTextFlow:                  React.PropTypes.function,
    togglecolumnLanguage:            React.PropTypes.function,
    openSearch:                      React.PropTypes.function,
  },
  render: function() {

    var options = [
      {
        onPress:this.props.togglecolumnLanguage,
        buttons:["english","bilingual","hebrew"],
        currVal: this.props.columnLanguage
      },
      {
        onPress:this.props.toggleTextFlow,
        buttons:["segmented","continuous"],
        currVal: this.props.textFlow
      }];
    var alignments = [["left","right"],["left","center","right"]];
    var optionViews = [];
    for (let optionRow of options) {
      let row = [];
      let count = 0;
      for (let option of optionRow.buttons) {
        let selected = optionRow.currVal == option;
        row.push(
          <ReaderDisplayOptionsMenuItem
            onPress={optionRow.onPress}
            text={option}
            align={alignments[optionRow.buttons.length-2][count]}
            selected={selected}
          />
        );
        count++;
      }
      optionViews.push(<ReaderDisplayOptionsMenuRow content={row}/>);
    }

    return (
        <View style={styles.readerDisplayOptionsMenu}>
          {optionViews}
        </View>
    );
  }
});

var ReaderDisplayOptionsMenuRow = React.createClass({
  render: function() {
    return (
      <View style={styles.readerDisplayOptionsMenuRow}>
        {this.props.content}
      </View>
    );
  }
});

var ReaderDisplayOptionsMenuItem = React.createClass({
  propTypes: {
    text:     React.PropTypes.string,
    align:    React.PropTypes.string,
    onPress:  React.PropTypes.func.isRequired,
    selected: React.PropTypes.bool
  },

  render: function () {
    let alignStyle;
    if (this.props.align == "right") alignStyle = styles.readerDisplayOptionsMenuItemRight;
    else if (this.props.align == "left") alignStyle = styles.readerDisplayOptionsMenuItemLeft;
    else /*if (this.props.align == "center") */ alignStyle = styles.readerDisplayOptionsMenuItemCenter;


    var tempStyles = [styles.readerDisplayOptionsMenuItem,alignStyle];
    if (this.props.selected)
      tempStyles.push(styles.readerDisplayOptionsMenuItemSelected);
    return (
      <TouchableOpacity onPress={this.props.onPress} style={tempStyles}>
        <Text style={[styles.title,{textAlign:"center"}]}>
          {this.props.text}
        </Text>
      </TouchableOpacity>
    );
  }
});

module.exports = ReaderDisplayOptionsMenu;
