'use strict';

import PropTypes from 'prop-types';

import React, { Component } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  Image
} from 'react-native';

import styles from './Styles.js';
var a_aleph_icon          = require('./img/a_aleph.png');
var a_icon                = require('./img/a_icon.png');
var a_icon_small          = require('./img/a_icon_small.png');
var aleph_icon            = require('./img/aleph.png');
var segmented_icon        = require('./img/breaks.png');
var continuous_icon       = require('./img/continuous.png');
var a_aleph_icon_light    = require('./img/a_aleph-light.png');
var a_icon_light          = require('./img/a_icon-light.png');
var a_icon_small_light    = require('./img/a_icon_small-light.png');
var aleph_icon_light      = require('./img/aleph-light.png');
var segmented_icon_light  = require('./img/breaks-light.png');
var continuous_icon_light = require('./img/continuous-light.png');


class ReaderDisplayOptionsMenu extends React.Component {
  static propTypes = {
    theme:                           PropTypes.object,
    textFlow:                        PropTypes.oneOf(['segmented', 'continuous']),
    canBeContinuous:                 PropTypes.bool,
    textLanguage:                    PropTypes.oneOf(['hebrew', 'english', 'bilingual']),
    themeStr:                        PropTypes.oneOf(['white', 'black']),
    setTextFlow:                     PropTypes.func,
    setTextLanguage:                 PropTypes.func,
    incrementFont:                   PropTypes.func,
    setTheme:                        PropTypes.func
  };

  render() {

    var options = [
      {
        onPress:this.props.setTextLanguage,
        buttons:["english","bilingual","hebrew"],
        icons: this.props.themeStr == "white" ? [a_icon,a_aleph_icon,aleph_icon]: [a_icon_light,a_aleph_icon_light,aleph_icon_light],
        currVal: this.props.textLanguage,
        parametrized: true
      },
      {
        divider: "true"
      },
      {
        onPress:this.props.setTheme,
        buttons:["white","black"],
        colors:["#ffffff", "#444444"],
        currVal: this.props.themeStr,
        parametrized: true
      },
      {
        onPress:this.props.incrementFont,
        buttons:["smaller","larger"],
        icons:this.props.themeStr == "white" ? [a_icon_small,a_icon]: [a_icon_small_light,a_icon_light],
        currVal: null,
        parametrized: true
      }
    ];

    var segcontopt =
    {
      onPress:this.props.setTextFlow,
      buttons:["segmented","continuous"],
      icons: this.props.themeStr == "white" ? [segmented_icon,continuous_icon]: [segmented_icon_light,continuous_icon_light],
      currVal: this.props.textFlow,
      parametrized: true
    };

    if (this.props.canBeContinuous) { //if can be continuous, add that option
      options.splice(1,0,segcontopt);
    }

    var alignments = [["left","right"],["left","center","right"]];
    var optionViews = [];
    for (let optionRow of options) {
      if (optionRow.divider) {
        optionViews.push(<View key={"options-divider"} style={[styles.readerDisplayOptionsMenuDivider, this.props.theme.readerDisplayOptionsMenuDivider]}/>);
      } else {
        let row = [];
        let isColor = "colors" in optionRow;

        for (let i = 0; i < optionRow.buttons.length; i++) {
          let option = optionRow.buttons[i];
          let selected = optionRow.currVal == option;

          if (isColor) {
            let color = optionRow.colors[i];
            row.push(
              <ReaderDisplayOptionsMenuColor
                key={option}
                theme={this.props.theme}
                option={option}
                onPress={optionRow.onPress}
                parametrized={optionRow.parametrized}
                color={color}
                align={alignments[optionRow.buttons.length-2][i]}
                selected={selected} />
            );
          } else {
            let icon = optionRow.icons[i];
            row.push(
              <ReaderDisplayOptionsMenuItem
                key={option}
                theme={this.props.theme}
                option={option}
                onPress={optionRow.onPress}
                parametrized={optionRow.parametrized}
                icon={icon}
                align={alignments[optionRow.buttons.length-2][i]}
                selected={selected} />
            );
          }

        }
        optionViews.push(<ReaderDisplayOptionsMenuRow key={optionRow.buttons[0] + "|row"} content={row} colorRow={isColor} theme={this.props.theme}/>);
      }

    }

    return (
        <View style={[styles.readerDisplayOptionsMenu,this.props.theme.readerDisplayOptionsMenu]}>
          {optionViews}
        </View>
    );
  }
}

class ReaderDisplayOptionsMenuRow extends React.Component {
  render() {
    //styles.readerDisplayOptionMenuRowNotColor is a hack required to solve the problem of react native / ios display not yet properly rendering borderRadius & borderWidth w/o 'smearing'
    var tempStyles = this.props.colorRow ? [styles.readerDisplayOptionsMenuRow] : [styles.readerDisplayOptionsMenuRow,styles.readerDisplayOptionMenuRowNotColor,this.props.theme.readerDisplayOptionsMenuDivider];
    return (
      <View style={tempStyles}>
        {this.props.content}
      </View>
    );
  }
}

class ReaderDisplayOptionsMenuItem extends React.Component {
  static propTypes = {
    theme:        PropTypes.object,
    option:       PropTypes.string,
    icon:         PropTypes.number, /*PTP: why are images numbers? */
    align:        PropTypes.string,
    onPress:      PropTypes.func.isRequired,
    parametrized: PropTypes.bool, /* should onPress() use option as a paremeter*/
    selected:     PropTypes.bool
  };

  render() {
    let alignStyle;
    if (this.props.align == "right") alignStyle = styles.readerDisplayOptionsMenuItemRight;
    else if (this.props.align == "left") alignStyle = styles.readerDisplayOptionsMenuItemLeft;
    else /*if (this.props.align == "center") */ alignStyle = styles.readerDisplayOptionsMenuItemCenter;

    var onPress = this.props.parametrized ? (()=>this.props.onPress(this.props.option)) : this.props.onPress;
    var tempStyles = [styles.readerDisplayOptionsMenuItem, this.props.theme.readerDisplayOptionsMenuItem, alignStyle];
    if (this.props.selected) {
      tempStyles.push(this.props.theme.readerDisplayOptionsMenuItemSelected);
    }
    return (
      <TouchableOpacity onPress={onPress} style={tempStyles}>
        <Image style={[styles.readerDisplayOptionsMenuIcon]} source={this.props.icon}/>
      </TouchableOpacity>
    );
  }
}

class ReaderDisplayOptionsMenuColor extends React.Component {
  static propTypes = {
    theme:        PropTypes.object,
    option:       PropTypes.string,
    color:        PropTypes.string,
    align:        PropTypes.string,
    onPress:      PropTypes.func.isRequired,
    parametrized: PropTypes.bool, /* should onPress() use option as a paremeter*/
    selected:     PropTypes.bool
  };

  render() {
    let alignStyle;
    if (this.props.align == "right") alignStyle = styles.readerDisplayOptionsMenuColorRight;
    else if (this.props.align == "left") alignStyle = styles.readerDisplayOptionsMenuColorLeft;
    else /*if (this.props.align == "center") */ alignStyle = styles.readerDisplayOptionsMenuColorCenter;

    var onPress = this.props.parametrized ? (()=>this.props.onPress(this.props.option)) : this.props.onPress;
    var tempStyles = [styles.readerDisplayOptionsMenuColor, this.props.theme.readerDisplayOptionsMenuColor, {"backgroundColor": this.props.color}, alignStyle];
    if (this.props.selected) {
      tempStyles.push(styles.readerDisplayOptionsMenuColorSelected);
    }
    return (
      <TouchableOpacity onPress={onPress} style={tempStyles}/>
    );
  }
}


export default ReaderDisplayOptionsMenu;
