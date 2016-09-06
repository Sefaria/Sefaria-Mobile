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
    setTextFlow:                     React.PropTypes.function,
    setColumnLanguage:               React.PropTypes.function,
    openSearch:                      React.PropTypes.function,
  },
  render: function() {

    var options = [
      {
        onPress:this.props.setColumnLanguage,
        buttons:["english","bilingual","hebrew"],
        icons:[a_icon,a_aleph_icon,aleph_icon],
        currVal: this.props.columnLanguage,
        parametrized: true
      },
      {
        onPress:this.props.setTextFlow,
        buttons:["segmented","continuous"],
        icons:[segmented_icon,continuous_icon],
        currVal: this.props.textFlow,
        parametrized: true
      },
      {
        divider: "true"
      },
      {
        onPress:()=>null,
        buttons:["decrementFont","incrementFont"],
        icons:[a_icon,a_icon],
        currVal: null,
        parametrized: false
      }
    ];
    var alignments = [["left","right"],["left","center","right"]];
    var optionViews = [];
    for (let optionRow of options) {
      if (optionRow.divider) {
        optionViews.push(<View style={{flex:1,flexDirection:"row",height:1,backgroundColor:"#DDD"}}/>);
      } else {
        let row = [];
        for (let i = 0; i < optionRow.buttons.length; i++) {
          let option = optionRow.buttons[i];
          let icon = optionRow.icons[i];
          let selected = optionRow.currVal == option;
          row.push(
            <ReaderDisplayOptionsMenuItem
              option={option}
              onPress={optionRow.onPress}
              parametrized={optionRow.parametrized}
              icon={icon}
              align={alignments[optionRow.buttons.length-2][i]}
              selected={selected}
            />
          );
        }
        optionViews.push(<ReaderDisplayOptionsMenuRow content={row}/>);
      }

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
    option:       React.PropTypes.string,
    icon:         React.PropTypes.object,
    align:        React.PropTypes.string,
    onPress:      React.PropTypes.func.isRequired,
    parametrized: React.PropTypes.bool, /* should onPress() use option as a paremeter*/
    selected:     React.PropTypes.bool
  },

  render: function () {
    let alignStyle;
    if (this.props.align == "right") alignStyle = styles.readerDisplayOptionsMenuItemRight;
    else if (this.props.align == "left") alignStyle = styles.readerDisplayOptionsMenuItemLeft;
    else /*if (this.props.align == "center") */ alignStyle = styles.readerDisplayOptionsMenuItemCenter;

    var onPress = this.props.parametrized ? (()=>this.props.onPress(this.props.option)) : this.props.onPress;
    var tempStyles = [styles.readerDisplayOptionsMenuItem,alignStyle];
    if (this.props.selected)
      tempStyles.push(styles.readerDisplayOptionsMenuItemSelected);
    return (
      <TouchableOpacity onPress={onPress} style={tempStyles}>
        <Image style={[styles.readerDisplayOptionsMenuIcon]} source={this.props.icon}/>
      </TouchableOpacity>
    );
  }
});

module.exports = ReaderDisplayOptionsMenu;
