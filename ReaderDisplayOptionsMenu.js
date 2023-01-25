'use strict';

import PropTypes from 'prop-types';

import React from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  Image,
  Animated,
} from 'react-native';
import styles from './Styles.js';
import strings from './LocalizedStrings';
import { VOCALIZATION } from './VocalizationEnum';
import {iconData} from "./IconData";

const menuIconNames = ['a_aleph', 'a_icon', 'a_icon_small', 'aleph', 'breaks', 'continuous', 'stacked', 'sidebyside', 'sidebysiderev']

class ReaderDisplayOptionsMenu extends React.Component {
  static whyDidYouRender = true;
  static propTypes = {
    theme:                           PropTypes.object,
    textFlow:                        PropTypes.oneOf(['segmented', 'continuous']),
    canHaveAliyot:                   PropTypes.bool.isRequired,
    canBeContinuous:                 PropTypes.bool.isRequired,
    vowelToggleAvailable:            PropTypes.oneOf([VOCALIZATION.TAAMIM_AND_NIKKUD, VOCALIZATION.NIKKUD, VOCALIZATION.NONE]),
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
      useNativeDriver: false,
    }).start();
  };

  hide = (cb) => {
    Animated.timing(this._position, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start(cb);
  };

  render() {
    const icons = menuIconNames.reduce((accum, iconName) => {
      accum[iconName] = iconData.get(iconName, this.props.themeStr);
      return accum;
    }, {});
    const options = [
      {
        label: strings.languageYo,
        onPress: this.props.setTextLanguage,
        buttons: ["english","bilingual","hebrew"],
        icons: [icons.a_icon, icons.a_aleph, icons.aleph],
        currVal: this.props.textLanguage,
        parametrized: true
      },
      {
        condition: this.props.canBeContinuous,
        label: strings.layout,
        onPress: this.props.setTextFlow,
        buttons: ["segmented","continuous"],
        icons: [icons.breaks, icons.continuous],
        currVal: this.props.textFlow,
        parametrized: true
      },
      {
        condition: this.props.textLanguage === 'bilingual',
        label: strings.bilingualLayout,
        onPress: this.props.setBiLayout,
        buttons: ["stacked", "sidebyside", "sidebysiderev"],
        icons: [icons.stacked, icons.sidebyside, icons.sidebysiderev],
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
        icons: [icons.a_icon_small, icons.a_icon],
        currVal: null,
        parametrized: true
      },
      {
        condition: this.props.vowelToggleAvailable < VOCALIZATION.NONE,
        label: this.props.vowelToggleAvailable === VOCALIZATION.TAAMIM_AND_NIKKUD ? strings.vocalization : strings.vowels,
        onPress: this.props.setVocalization,
        buttons:[VOCALIZATION.TAAMIM_AND_NIKKUD, VOCALIZATION.NIKKUD, VOCALIZATION.NONE].slice(this.props.vowelToggleAvailable),
        text: ["אָ֑", "אָ", "א"].slice(this.props.vowelToggleAvailable),
        textStyle: [styles.he, {fontSize: 26}],
        currVal: Math.max(this.props.vocalization, this.props.vowelToggleAvailable),
        parametrized: true,
      },
    ];
    const alignments = [["left","right"],["left","center","right"]];
    let toggleSets = []; // two toggle sets per row
    const rows = [];
    for (let j = 0; j < options.length; j++) {
      let optionRow = options[j];
      let row = [];
      let isColor = "colors" in optionRow;
      if (typeof optionRow.condition == 'undefined' || optionRow.condition) {
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
                textStyle={optionRow.textStyle}
                align={alignments[optionRow.buttons.length-2][i]}
                selected={selected}
                interfaceLanguage={this.props.interfaceLanguage} />
            );
          }
        }
        toggleSets.push(<ReaderDisplayOptionsMenuToggleSet key={optionRow.label + "|toggleSet"} label={optionRow.label} content={row} colorRow={isColor} theme={this.props.theme} interfaceLanguage={this.props.interfaceLanguage}/>);
      }
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
    option:       PropTypes.oneOfType([PropTypes.string, PropTypes.bool, PropTypes.number]),
    icon:         PropTypes.number, /*PTP: why are images numbers? */
    iconLength:   PropTypes.number,
    text:         PropTypes.string,
    textStyle:    PropTypes.array,
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
          <Text style={[langStyle, this.props.theme.secondaryText].concat(this.props.textStyle)}>{this.props.text}</Text>
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
