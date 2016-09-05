'use strict';

import React, { Component } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  Image
} from 'react-native';
var styles          = require('./Styles.js');
var a_aleph_icon    = require('./img/a_aleph2.png');
var a_icon          = require('./img/a_icon.png');
var aleph_icon      = require('./img/aleph.png');
var segmented_icon  = require('./img/breaks.png');
var continuous_icon = require('./img/continuous.png');

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
        icons:[a_icon,a_aleph_icon,aleph_icon],
        iconWidths:[15,30,15],
        currVal: this.props.columnLanguage
      },
      {
        onPress:this.props.toggleTextFlow,
        buttons:["segmented","continuous"],
        icons:[segmented_icon,continuous_icon],
        iconWidths:[15,15],
        currVal: this.props.textFlow
      }];
    var alignments = [["left","right"],["left","center","right"]];
    var optionViews = [];
    for (let optionRow of options) {
      let row = [];
      for (let i = 0; i < optionRow.buttons.length; i++) {
        let option = optionRow.buttons[i];
        let icon = optionRow.icons[i];
        let iconWidth = optionRow.iconWidths[i];
        let selected = optionRow.currVal == option;
        row.push(
          <ReaderDisplayOptionsMenuItem
            onPress={optionRow.onPress}
            icon={icon}
            iconWidth={iconWidth}
            align={alignments[optionRow.buttons.length-2][i]}
            selected={selected}
          />
        );
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
    icon:     React.PropTypes.string,
    iconWidth:React.PropTypes.number,
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
        <Image style={[styles.readerDisplayOptionsMenuIcon,{width:this.props.iconWidth}]} source={this.props.icon}/>
      </TouchableOpacity>
    );
  }
});

module.exports = ReaderDisplayOptionsMenu;
