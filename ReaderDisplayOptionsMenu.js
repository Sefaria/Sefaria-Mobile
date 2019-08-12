'use strict';

import PropTypes from 'prop-types';

import React, { Component } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  Image,
  Animated,
  Platform,
} from 'react-native';
import styles from './Styles.js';
import strings from './LocalizedStrings';

var a_aleph_icon          = require('./img/a_aleph.png');
var a_icon                = require('./img/a_icon.png');
var a_icon_small          = require('./img/a_icon_small.png');
var aleph_icon            = require('./img/aleph.png');
var segmented_icon        = require('./img/breaks.png');
var continuous_icon       = require('./img/continuous.png');
var stacked_icon          = require('./img/stacked.png');
var side_icon             = require('./img/sidebyside.png');
var siderev_icon          = require('./img/sidebysiderev.png');
var a_aleph_icon_light    = require('./img/a_aleph-light.png');
var a_icon_light          = require('./img/a_icon-light.png');
var a_icon_small_light    = require('./img/a_icon_small-light.png');
var aleph_icon_light      = require('./img/aleph-light.png');
var segmented_icon_light  = require('./img/breaks-light.png');
var continuous_icon_light = require('./img/continuous-light.png');
var stacked_icon_light    = require('./img/stacked-light.png');
var side_icon_light       = require('./img/sidebyside-light.png');
var siderev_icon_light    = require('./img/sidebysiderev-light.png');


class ReaderDisplayOptionsMenu extends React.Component {
  static propTypes = {
    theme:                           PropTypes.object,
    textFlow:                        PropTypes.oneOf(['segmented', 'continuous']),
    canHaveAliyot:                   PropTypes.bool.isRequired,
    canBeContinuous:                 PropTypes.bool.isRequired,
    interfaceLanguage:               PropTypes.oneOf(['hebrew', 'english']).isRequired,
    textLanguage:                    PropTypes.oneOf(['hebrew', 'english', 'bilingual']),
    themeStr:                        PropTypes.oneOf(['white', 'black']),
    showAliyot:                      PropTypes.bool.isRequired,
    setTextFlow:                     PropTypes.func,
    setTextLanguage:                 PropTypes.func,
    setAliyot:                       PropTypes.func,
    incrementFont:                   PropTypes.func,
    setTheme:                        PropTypes.func
  };
  constructor(props) {
    super(props);
    this._position = new Animated.Value(0);
  }

  show = () => {
    Animated.timing(this._position, {
      toValue: 1,
      duration: 250,
    }).start();
  };

  hide = (cb) => {
    Animated.timing(this._position, {
      toValue: 0,
      duration: 250,
    }).start(cb);
  };

  render() {
    const options = [
      {
        label: strings.languageYo,
        onPress: this.props.setTextLanguage,
        buttons: ["english","bilingual","hebrew"],
        icons: this.props.themeStr == "white" ? [a_icon,a_aleph_icon,aleph_icon]: [a_icon_light,a_aleph_icon_light,aleph_icon_light],
        currVal: this.props.textLanguage,
        parametrized: true
      },
      {
        condition: this.props.canBeContinuous,
        label: strings.layout,
        onPress: this.props.setTextFlow,
        buttons: ["segmented","continuous"],
        icons: this.props.themeStr == "white" ? [segmented_icon,continuous_icon]: [segmented_icon_light,continuous_icon_light],
        currVal: this.props.textFlow,
        parametrized: true
      },
      {
        condition: this.props.textLanguage === 'bilingual',
        label: strings.bilingualLayout,
        onPress: this.props.setBiLayout,
        buttons: ["stacked", "sidebyside", "sidebysiderev"],
        icons: this.props.themeStr == "white" ? [stacked_icon,side_icon,siderev_icon] : [stacked_icon_light,side_icon_light,siderev_icon_light],
        currVal: this.props.biLayout,
        parametrized: true,
        iconLength: 19,
      },
      {
        label: strings.color,
        onPress: this.props.setTheme,
        buttons:["white","black"],
        colors:["#ffffff", "#444444"],
        currVal: this.props.themeStr,
        parametrized: true
      },
      {
        condition: this.props.canHaveAliyot,
        label: strings.aliyot,
        onPress: this.props.setAliyot,
        buttons:[true, false],
        text: [strings.on, strings.off],
        currVal: this.props.showAliyot,
        parametrized: true,
      },
      {
        label: strings.fontSize,
        onPress: this.props.incrementFont,
        buttons:["smaller","larger"],
        icons: this.props.themeStr == "white" ? [a_icon_small,a_icon]: [a_icon_small_light,a_icon_light],
        currVal: null,
        parametrized: true
      }
    ];
    const alignments = [["left","right"],["left","center","right"]];
    let toggleSets = []; // two toggle sets per row
    const rows = [];
    for (let j = 0; j < options.length; j++) {
      let optionRow = options[j];
      if (typeof optionRow.condition !== 'undefined' && !optionRow.condition) { continue; }
      let row = [];
      let isColor = "colors" in optionRow;

      for (let i = 0; i < optionRow.buttons.length; i++) {
        let option = optionRow.buttons[i];
        let selected = optionRow.currVal === option;

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
          const icon = !!optionRow.icons ? optionRow.icons[i] : null;
          const text = !!optionRow.text ? optionRow.text[i] : null;
          row.push(
            <ReaderDisplayOptionsMenuItem
              key={option}
              theme={this.props.theme}
              option={option}
              onPress={optionRow.onPress}
              parametrized={optionRow.parametrized}
              icon={icon}
              iconLength={optionRow.iconLength}
              text={text}
              align={alignments[optionRow.buttons.length-2][i]}
              selected={selected}
              interfaceLanguage={this.props.interfaceLanguage} />
          );
        }

      }
      toggleSets.push(<ReaderDisplayOptionsMenuToggleSet key={optionRow.label + "|toggleSet"} label={optionRow.label} content={row} colorRow={isColor} theme={this.props.theme} interfaceLanguage={this.props.interfaceLanguage}/>);
      if (toggleSets.length % 2 === 0 || j === options.length - 1) {
        rows.push(<ReaderDisplayOptionsMenuRow key={optionRow.label + "|row"} content={toggleSets.slice(0)} />);
        toggleSets = [];
      }
    }
    const myStyles = [
      styles.readerDisplayOptionsMenu,
      this.props.theme.readerDisplayOptionsMenu,
      {
        top: this._position.interpolate({
          inputRange: [0, 1],
          outputRange: [-350, 0],
          extrapolate: 'clamp',
        }),
      },
    ];
    return (
      <View style={styles.readerDisplayOptionsMenuMask}>
        <Animated.View style={myStyles}>
            {rows}
        </Animated.View>
      </View>
    );
  }
}

class ReaderDisplayOptionsMenuRow extends React.Component {
    render() {
      return (<View style={styles.readerDisplayOptionsMenuRow}>
        {this.props.content}
      </View>);
    }
}

class ReaderDisplayOptionsMenuToggleSet extends React.Component {
  render() {
    //styles.readerDisplayOptionMenuRowNotColor is a hack required to solve the problem of react native / ios display not yet properly rendering borderRadius & borderWidth w/o 'smearing'
    const tempStyles = this.props.colorRow ? [styles.readerDisplayOptionsMenuToggleSet] : [styles.readerDisplayOptionsMenuToggleSet,styles.readerDisplayOptionMenuToggleSetNotColor,this.props.theme.readerDisplayOptionsMenuDivider];
    const langStyle = this.props.interfaceLanguage === "hebrew" ? styles.heInt : styles.enInt;
    return (
      <View style={styles.readerDisplayOptionsMenuToggleSetOuter}>
        <Text style={[langStyle, {textAlign: "center"}, this.props.theme.secondaryText]}>{this.props.label}</Text>
        <View style={tempStyles}>
          {this.props.content}
        </View>
      </View>
    );
  }
}

class ReaderDisplayOptionsMenuItem extends React.Component {
  static propTypes = {
    theme:        PropTypes.object,
    option:       PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    icon:         PropTypes.number, /*PTP: why are images numbers? */
    iconLength:   PropTypes.number,
    text:         PropTypes.string,
    align:        PropTypes.string,
    onPress:      PropTypes.func.isRequired,
    parametrized: PropTypes.bool, /* should onPress() use option as a paremeter*/
    selected:     PropTypes.bool
  };

  render() {
    const langStyle = this.props.interfaceLanguage === "hebrew" ? styles.heInt : styles.enInt;
    let alignStyle;
    if (this.props.align == "right") alignStyle = styles.readerDisplayOptionsMenuItemRight;
    else if (this.props.align == "left") alignStyle = styles.readerDisplayOptionsMenuItemLeft;
    else /*if (this.props.align == "center") */ alignStyle = styles.readerDisplayOptionsMenuItemCenter;

    var onPress = this.props.parametrized ? (()=>this.props.onPress(this.props.option)) : this.props.onPress;
    var tempStyles = [styles.readerDisplayOptionsMenuItem, this.props.theme.readerDisplayOptionsMenuItem, alignStyle];
    if (this.props.selected) {
      tempStyles.push(this.props.theme.readerDisplayOptionsMenuItemSelected);
    }
    const iconStyles = [styles.readerDisplayOptionsMenuIcon];
    if (this.props.iconLength) {
      iconStyles.push({width: this.props.iconLength, height: this.props.iconLength});
    }
    return (
      <TouchableOpacity onPress={onPress} style={tempStyles}>
        {this.props.icon ?
          <Image resizeMode={'contain'} style={iconStyles} source={this.props.icon}/> :
          <Text style={[langStyle, this.props.theme.secondaryText]}>{this.props.text}</Text>
        }
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
