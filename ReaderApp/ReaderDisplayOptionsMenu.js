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
    theme:                           React.PropTypes.object,
    textFlow:                        React.PropTypes.oneOf(['segmented','continuous']),
    textReference:                   React.PropTypes.string,
    columnLanguage:                  React.PropTypes.oneOf(['hebrew','english','bilingual']),
    themeStr:                        React.PropTypes.oneOf(['white','grey','black']),
    setTextFlow:                     React.PropTypes.func,
    setColumnLanguage:               React.PropTypes.func,
    incrementFont:                   React.PropTypes.func,
    setTheme:                        React.PropTypes.func
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
        onPress:this.props.setTheme,
        buttons:["white","grey","black"],
        colors:["#ffffff","#dddddd","#444444"],
        currVal: this.props.themeStr,
        parametrized: true
      },
      {
        onPress:this.props.incrementFont,
        buttons:["decrementFont","incrementFont"],
        icons:[a_icon,a_icon],
        currVal: null,
        parametrized: true
      }
    ];
    var alignments = [["left","right"],["left","center","right"]];
    var optionViews = [];
    for (let optionRow of options) {
      if (optionRow.divider) {
        optionViews.push(<View style={[styles.readerDisplayOptionsMenuDivider, this.props.theme.readerDisplayOptionsMenuDivider]}/>);
      } else {
        let row = [];
        let isColor = "colors" in optionRow;
        if (isColor) {

        } else {

        }
        for (let i = 0; i < optionRow.buttons.length; i++) {
          let option = optionRow.buttons[i];
          let selected = optionRow.currVal == option;

          if (isColor) {
            let color = optionRow.colors[i];
            row.push(
              <ReaderDisplayOptionsMenuColor
                theme={this.props.theme}
                option={option}
                onPress={optionRow.onPress}
                parametrized={optionRow.parametrized}
                color={color}
                align={alignments[optionRow.buttons.length-2][i]}
                selected={selected}
              />
            );
          } else {
            let icon = optionRow.icons[i];
            row.push(
              <ReaderDisplayOptionsMenuItem
                theme={this.props.theme}
                option={option}
                onPress={optionRow.onPress}
                parametrized={optionRow.parametrized}
                icon={icon}
                align={alignments[optionRow.buttons.length-2][i]}
                selected={selected}
              />
            );
          }

        }
        optionViews.push(<ReaderDisplayOptionsMenuRow content={row}/>);
      }

    }

    return (
        <View style={[styles.readerDisplayOptionsMenu,this.props.theme.readerDisplayOptionsMenu]}>
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
    theme:        React.PropTypes.object,
    option:       React.PropTypes.string,
    icon:         React.PropTypes.number, /*PTP: why are images numbers? */
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
    var tempStyles = [styles.readerDisplayOptionsMenuItem, this.props.theme.readerDisplayOptionsMenuItem, alignStyle];
    if (this.props.selected)
      tempStyles.push(this.props.theme.readerDisplayOptionsMenuItemSelected);
    return (
      <TouchableOpacity onPress={onPress} style={tempStyles}>
        <Image style={[styles.readerDisplayOptionsMenuIcon]} source={this.props.icon}/>
      </TouchableOpacity>
    );
  }
});

var ReaderDisplayOptionsMenuColor = React.createClass({
  propTypes: {
    theme:        React.PropTypes.object,
    option:       React.PropTypes.string,
    color:        React.PropTypes.string,
    align:        React.PropTypes.string,
    onPress:      React.PropTypes.func.isRequired,
    parametrized: React.PropTypes.bool, /* should onPress() use option as a paremeter*/
    selected:     React.PropTypes.bool
  },

  render: function () {
    let alignStyle;
    if (this.props.align == "right") alignStyle = styles.readerDisplayOptionsMenuColorRight;
    else if (this.props.align == "left") alignStyle = styles.readerDisplayOptionsMenuColorLeft;
    else /*if (this.props.align == "center") */ alignStyle = styles.readerDisplayOptionsMenuColorCenter;

    var onPress = this.props.parametrized ? (()=>this.props.onPress(this.props.option)) : this.props.onPress;
    var tempStyles = [styles.readerDisplayOptionsMenuColor, this.props.theme.readerDisplayOptionsMenuColor, {"backgroundColor": this.props.color}, alignStyle];
    if (this.props.selected)
      tempStyles.push(styles.readerDisplayOptionsMenuColorSelected);
    return (
      <TouchableOpacity onPress={onPress} style={tempStyles}/>
    );
  }
});

module.exports = ReaderDisplayOptionsMenu;
