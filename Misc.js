'use strict';

import PropTypes from 'prop-types';

import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableHighlight,
  View,
  Image,
  ActivityIndicator,
  ViewPropTypes,
  Linking,
  Animated,
} from 'react-native';

import Sefaria from './sefaria';
import styles from './Styles.js';


const SefariaProgressBar = ({ theme, themeStr, progress, onPress, onClose }) => (
  <TouchableOpacity onPress={onPress} style={{height: 50, justifyContent: "center"}}>
    <View style={{flex: 1, flexDirection: "row"}}>
      <View style={{flex: progress, backgroundColor: "#fff"}}>
      </View>
      <View style={{flex: 1-progress, backgroundColor: "#eee"}}>
      </View>
    </View>
    <View style={{flex:1, flexDirection: "row", position: "absolute", right: 0, left: 0, paddingHorizontal: 10, justifyContent: "space-between"}}>
      <Text style={{color: "#999"}}>{`DOWNLOADING (${Math.round(progress*1000)/10}%)`}</Text>
      <TouchableOpacity onPress={onClose}>
        <Image
          source={themeStr === 'white' ? require('./img/close.png') : require('./img/close-light.png')}
          resizeMode={Image.resizeMode.contain}
          style={{width: 14, height: 14}}
        />
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);

class TwoBox extends React.Component {
  static propTypes = {
      content:  PropTypes.array.isRequired,
      language: PropTypes.oneOf(["hebrew","english"]),
  };

  render() {
      var content = this.props.content.map(function(item, i) {
          return (<View style={styles.twoBoxItem} key={i}>{item}</View>);
      });
      if (content.length % 2 !== 0) {
        content.push(<View style={styles.twoBoxItem} key={i+1}></View>);
      }
      var rows = [];
      var rowStyle = this.props.language == "hebrew" ? [styles.twoBoxRow, styles.rtlRow] : [styles.twoBoxRow];

      for (var i=0; i < content.length; i += 2) {
        var items = [content[i], content[i+1]];
        rows.push(<View style={rowStyle} key={i}>{items}</View>);
      }
      return (<View style={styles.twoBox}>{rows}</View>);
  }
}

class CategoryBlockLink extends React.Component {
  static propTypes = {
    theme:     PropTypes.object.isRequired,
    category:  PropTypes.string,
    heCat:     PropTypes.string,
    language:  PropTypes.string,
    style:     PropTypes.object,
    isSans:    PropTypes.bool,
    upperCase: PropTypes.bool,
    withArrow: PropTypes.bool,
    onPress:   PropTypes.func,
    icon:      PropTypes.number,
    iconSide:  PropTypes.oneOf(["start", "end"])
  };

  render() {
    const isHeb = this.props.language == "hebrew";
    const iconOnLeft = this.props.iconSide ? this.props.iconSide === "start" ^ isHeb : isHeb;
    var style  = this.props.style || {"borderColor": Sefaria.palette.categoryColor(this.props.category)};
    var enText = this.props.upperCase ? this.props.category.toUpperCase() : this.props.category;
    var heText = this.props.heCat || Sefaria.hebrewCategory(this.props.category);
    var textStyle  = [styles.centerText, this.props.theme.text, this.props.upperCase ? styles.spacedText : null];
    var content = isHeb ?
      (<Text style={[this.props.isSans ? styles.heInt : styles.hebrewText].concat(textStyle)}>{heText}</Text>) :
      (<Text style={[this.props.isSans ? styles.enInt : styles.englishText].concat(textStyle)}>{enText}</Text>);
    return (<TouchableOpacity onPress={this.props.onPress} style={[styles.readerNavCategory, this.props.theme.readerNavCategory, style]}>
              { iconOnLeft && (this.props.withArrow || this.props.icon) ? <Image source={ this.props.withArrow || !this.props.icon ? (this.props.themeStr == "white" ? require('./img/back.png') : require('./img/back-light.png')) : this.props.icon }
                style={[styles.moreArrowHe, this.props.isSans ? styles.categoryBlockLinkIconSansHe : null]}
                resizeMode={Image.resizeMode.contain} /> : null }
              {content}
              { !iconOnLeft && (this.props.withArrow || this.props.icon) ? <Image source={ this.props.withArrow || !this.props.icon ? (this.props.themeStr == "white" ? require('./img/forward.png'): require('./img/forward-light.png')) : this.props.icon }
                style={[styles.moreArrowEn, this.props.isSans ? styles.categoryBlockLinkIconSansEn : null]}
                resizeMode={Image.resizeMode.contain} /> : null }
            </TouchableOpacity>);
  }
}

class CategorySideColorLink extends React.Component {
  static propTypes = {
    theme:      PropTypes.object.isRequired,
    themeStr:   PropTypes.string.isRequired,
    language:   PropTypes.string.isRequired,
    category:   PropTypes.string.isRequired,
    enText:     PropTypes.string.isRequired,
    heText:     PropTypes.string,
    onPress:    PropTypes.func.isRequired,
  }

  render() {
    const { theme, themeStr } = this.props;
    const isHeb = this.props.language === 'hebrew';
    const borderSide = isHeb ? "Right" : "Left";
    const text = isHeb ? (this.props.heText || Sefaria.hebrewCategory(this.props.category)) : this.props.enText;

    return (
      <TouchableHighlight underlayColor={themeStr} style={{flex:1}} onPress={this.props.onPress}>
        <View style={{flex:1, flexDirection: isHeb ? "row-reverse" : "row"}}>
          <View style={{width: 6, [`border${borderSide}Color`]: Sefaria.palette.categoryColor(this.props.category), [`border${borderSide}Width`]: 6,}} />
          <View style={[styles.categorySideColorLink, theme.menu, theme.borderedBottom]}>
            <Text style={[isHeb ? styles.hebrewText : styles.englishText, theme.text]}>{text}</Text>
          </View>
        </View>
      </TouchableHighlight>
    )
  }
}

class AnimatedRow extends React.Component {
  static propTypes = {
    children: PropTypes.any.isRequired,
    animationDuration: PropTypes.number.isRequired,
    onRemove: PropTypes.func,
  }

  constructor(props) {
    super(props);
    this._position = new Animated.Value(1);
    this._height = new Animated.Value(1);
  }

  remove = () => {
    const { onRemove, animationDuration } = this.props;
    if (onRemove) {
      Animated.sequence([
        Animated.timing(this._position, {
          toValue: 0,
          duration: animationDuration,
        }),
        Animated.timing(this._height, {
          toValue: 0,
          duration: animationDuration,
        })
      ]).start(() => onRemove());
    }
  }

  render() {
    const rowStyles = [
      {
        height: this._height.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 50],
          extrapolate: 'clamp',
        }),
        left: this._position.interpolate({
          inputRange: [0, 1],
          outputRange: [-200, 0],
          extrapolate: 'clamp',
        }),
        opacity: this._position,
      },
    ];

    return (
      <Animated.View style={rowStyles}>
        {this.props.children}
      </Animated.View>
    )
  }
}

class CategoryColorLine extends React.Component {
  render() {
    var style = {backgroundColor: Sefaria.palette.categoryColor(this.props.category)};
    return (<View style={[styles.categoryColorLine, style]}></View>);
  }
}

class CategoryAttribution extends React.Component {
  static propTypes = {
    categories: PropTypes.array,
    language:   PropTypes.string.isRequired,
    context:    PropTypes.string.isRequired,
    linked:     PropTypes.bool,
  };
  static defaultProps = {
    linked:     true,
  };

  render() {
    if (!this.props.categories) { return null; }
    var attribution = Sefaria.categoryAttribution(this.props.categories);
    if (!attribution) { return null; }

    var openLink = () => {Linking.openURL(attribution.link)};
    var boxStyles = [styles.categoryAttribution, styles[this.props.context + "CategoryAttribution" ]];
    var content = this.props.language == "english" ?
                <Text style={styles[this.props.context + "CategoryAttributionTextEn"]}>{attribution.english}</Text> :
                <Text style={styles[this.props.context + "CategoryAttributionTextHe"]}>{attribution.hebrew}</Text>;

    return this.props.linked ?
            <TouchableOpacity style={boxStyles} onPress={openLink}>
              {content}
            </TouchableOpacity> :
            <View style={boxStyles}>
              {content}
            </View>;
  }
}

class LibraryNavButton extends React.Component {
  static propTypes = {
    theme:           PropTypes.object,
    themeStr:        PropTypes.string,
    menuLanguage:    PropTypes.string.isRequired,
    isCat:           PropTypes.bool.isRequired,
    onPress:         PropTypes.func.isRequired,
    onPressCheckBox: PropTypes.func,
    checkBoxSelected:PropTypes.number,
    enText:          PropTypes.string.isRequired,
    heText:          PropTypes.string.isRequired,
    count:           PropTypes.number,
    withArrow:       PropTypes.bool.isRequired,
    buttonStyle:     PropTypes.oneOfType([ViewPropTypes.style, PropTypes.array]),
  };

  render() {
    let { theme, themeStr, menuLanguage, isCat, onPress, onPressCheckBox, checkBoxSelected, enText, heText, count, withArrow, buttonStyle } = this.props;
    let colorCat = Sefaria.palette.categoryColor(enText.replace(" Commentaries", ""));
    enText = isCat ? enText.toUpperCase() : enText;
    let colorStyle = isCat ? [{"borderColor": colorCat}] : [theme.searchResultSummary, {"borderTopWidth": 1}];
    let textStyle  = [isCat ? styles.spacedText : null];
    let flexDir = menuLanguage == "english" ? "row" : "row-reverse";
    let textMargin = !!onPressCheckBox ? { marginHorizontal: 0 } : styles.readerSideMargin;
    if (count === 0) { textStyle.push(theme.secondaryText); }
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[styles.searchFilterCat, {flexDirection: flexDir}, buttonStyle].concat(colorStyle)}>
        <View style={{flexDirection: flexDir, alignItems: "center"}}>
          {
            !!onPressCheckBox ? <TouchableOpacity style={{paddingHorizontal: 10, paddingVertical: 15}} onPress={onPressCheckBox} >
              <IndeterminateCheckBox themeStr={themeStr} state={checkBoxSelected} onPress={onPressCheckBox} />
            </TouchableOpacity> : null
          }
          { menuLanguage == "english" ?
            <Text style={[styles.englishText].concat([theme.tertiaryText, textStyle, {paddingTop:3}, textMargin])}>
              {`${enText} `}
              {
                !!count ? <Text style={[styles.englishText].concat([theme.secondaryText, textStyle])}>{`(${count})`}</Text> : null
              }
            </Text>
            :
            <Text style={[styles.hebrewText].concat([theme.tertiaryText, textStyle, {paddingTop:13}, textMargin])}>
              {`${heText} `}
              {
                !!count ? <Text style={[styles.englishText].concat([theme.secondaryText, textStyle])}>{`(${count})`}</Text> : null
              }
            </Text>
          }
        </View>
        { withArrow ?
          <DirectedArrow themeStr={themeStr} imageStyle={{opacity: 0.5}} language={menuLanguage} direction={"forward"} />
          : null
        }
     </TouchableOpacity>);
  }
}

class LanguageToggleButton extends React.Component {
  static propTypes = {
    theme:          PropTypes.object.isRequired,
    language:       PropTypes.string.isRequired,
    toggleLanguage: PropTypes.func.isRequired,
    margin:         PropTypes.bool
  };

  render() {
    var content = this.props.language == "hebrew" ?
        (<Text style={[styles.languageToggleTextEn, this.props.theme.languageToggleText, styles.en]}>A</Text>) :
        (<Text style={[styles.languageToggleTextHe, this.props.theme.languageToggleText, styles.he]}>א</Text>);
    var style = [styles.languageToggle, this.props.theme.languageToggle];
    return (<TouchableOpacity style={style} onPress={this.props.toggleLanguage}>
              {content}
            </TouchableOpacity>);
  }
}

class CollapseIcon extends React.Component {
  static propTypes = {
    themeStr:  PropTypes.string,
    showHebrew:  PropTypes.bool,
    isVisible: PropTypes.bool
  };

  render() {
    var src;
    if (this.props.themeStr == "white") {
      if (this.props.isVisible) {
        src = require('./img/down.png');
      } else {
        if (this.props.showHebrew) {
          src = require('./img/back.png');
        } else {
          src = require('./img/forward.png');
        }
      }
    } else {
      if (this.props.isVisible) {
        src = require('./img/down-light.png');
      } else {
        if (this.props.showHebrew) {
          src = require('./img/back-light.png');
        } else {
          src = require('./img/forward-light.png');
        }
      }
    }
    return (<Image source={src}
             style={(this.props.showHebrew ? styles.collapseArrowHe : styles.collapseArrowEn)}
             resizeMode={Image.resizeMode.contain} />);
  }
}

class DirectedButton extends React.Component {
  //simple button with onPress() and a forward/back arrow. NOTE: arrow should change direction depending on interfaceLang
  static propTypes = {
    text:       PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    themeStr:   PropTypes.string.isRequired,
    language:   PropTypes.oneOf(["hebrew", "english"]).isRequired,
    textStyle:  PropTypes.oneOfType([Text.propTypes.style, PropTypes.array]),
    imageStyle: PropTypes.oneOfType([ViewPropTypes.style, PropTypes.array]),
    onPress:    PropTypes.func.isRequired,
    direction:  PropTypes.oneOf(["forward", "back"]).isRequired
  };

  render() {
    //the actual dir the arrow will face
    var actualDirBack = (this.props.language === "hebrew"  && this.props.direction === "forward") || (this.props.language === "english" && this.props.direction === "back")
    return (
      <TouchableOpacity onPress={this.props.onPress}
        style={[{ flexDirection: actualDirBack ? "row-reverse" : "row" }]}>
        { this.props.text ? <Text style={this.props.textStyle}>{this.props.text}</Text> : null}
        <DirectedArrow
          themeStr={this.props.themeStr}
          imageStyle={this.props.imageStyle}
          language={this.props.language}
          direction={this.props.direction} />
      </TouchableOpacity>
    );
  }
}

class DirectedArrow extends React.Component {
  static propTypes = {
    imageStyle:   PropTypes.oneOfType([ViewPropTypes.style, PropTypes.array]),
    themeStr:     PropTypes.string,
    language:     PropTypes.oneOf(["hebrew", "english"]).isRequired,
    direction:  PropTypes.oneOf(["forward", "back"]).isRequired,
  }

  render() {
    var actualDirBack = (this.props.language === "hebrew"  && this.props.direction === "forward") || (this.props.language === "english" && this.props.direction === "back")
    //I wish there was a way to reduce these if statements, but there's a limitation that require statements can't have variables in them
    var src;
    if (actualDirBack) {
      if (this.props.themeStr === "white") {
        src = require("./img/back.png");
      } else {
        src = require("./img/back-light.png");
      }
    } else {
      if (this.props.themeStr === "white") {
        src = require("./img/forward.png");
      } else {
        src = require("./img/forward-light.png");
      }
    }
    return (
      <Image source={src} style={this.props.imageStyle} resizeMode={Image.resizeMode.contain}/>
    );
  }
}

class SearchButton extends React.Component {
  render() {
    return (<TouchableOpacity style={[styles.headerButton, styles.headerButtonSearch]} onPress={this.props.onPress}>
                <Image source={this.props.themeStr == "white" ? require('./img/search.png'): require('./img/search-light.png') }

                     style={styles.searchButton}
                     resizeMode={Image.resizeMode.contain} />
              </TouchableOpacity>);
  }
}

class MenuButton extends React.Component {
  render() {
    return (<TouchableOpacity style={[styles.headerButton, styles.leftHeaderButton]} onPress={this.props.onPress}>
              <Image source={this.props.themeStr == "white" ? require('./img/menu.png'): require('./img/menu-light.png') }
                     style={styles.menuButton}
                     resizeMode={Image.resizeMode.contain} />
            </TouchableOpacity>);
  }
}

class CloseButton extends React.Component {
  render() {
    return (<TouchableOpacity style={[styles.headerButton, styles.leftHeaderButton]} onPress={this.props.onPress}>
              <Image source={this.props.themeStr == "white" ? require('./img/close.png'): require('./img/close-light.png') }
                 style={styles.closeButton}
                 resizeMode={Image.resizeMode.contain} />
            </TouchableOpacity>);
  }
}

class TripleDots extends React.Component {
  render() {
    return (<TouchableOpacity style={styles.tripleDotsContainer} onPress={this.props.onPress}>
              <Image style={styles.tripleDots} source={this.props.themeStr == "white" ? require('./img/dots.png'): require('./img/dots-light.png') } />
            </TouchableOpacity>);
  }
}

class DisplaySettingsButton extends React.Component {
  render() {
    return (<TouchableOpacity style={[styles.headerButton, styles.rightHeaderButton]} onPress={this.props.onPress}>
              <Image source={this.props.themeStr == "white" ? require('./img/a-aleph.png'): require('./img/a-aleph-light.png') }
                     style={styles.displaySettingsButton}
                     resizeMode={Image.resizeMode.contain} />
            </TouchableOpacity>);
  }
}

class ToggleSet extends React.Component {
  static propTypes = {
    theme:       PropTypes.object.isRequired,
    options:     PropTypes.array.isRequired, // array of object with `name`. `text`, `heText`, `onPress`
    contentLang: PropTypes.string.isRequired,
    active:      PropTypes.string.isRequired
  };

  render() {
    var showHebrew = this.props.contentLang == "hebrew";
    var options = this.props.options.map(function(option, i) {
      var style = [styles.navToggle, this.props.theme.navToggle].concat(this.props.active === option.name ? [styles.navToggleActive, this.props.theme.navToggleActive] : []);
      return (
        <TouchableOpacity onPress={option.onPress} key={i} >
          {showHebrew ?
            <Text style={[style, styles.heInt]}>{option.heText}</Text> :
            <Text style={[style, styles.enInt]}>{option.text}</Text> }
        </TouchableOpacity>
      );
    }.bind(this));

    var dividedOptions = [];
    for (var i = 0; i < options.length; i++) {
      dividedOptions.push(options[i])
      dividedOptions.push(<Text style={[styles.navTogglesDivider,this.props.theme.navTogglesDivider]} key={i+"d"}>|</Text>);
    }
    dividedOptions = dividedOptions.slice(0,-1);

    return (<View style={styles.navToggles}>
              {dividedOptions}
            </View>);
  }
}

class ButtonToggleSet extends React.Component {
  static propTypes = {
    theme:       PropTypes.object.isRequired,
    options:     PropTypes.array.isRequired, // array of object with `name`. `text`, `onPress`
    lang:        PropTypes.string.isRequired,
    active:      PropTypes.oneOfType([PropTypes.bool, PropTypes.string])
  };

  render() {
    var showHebrew = this.props.lang == "hebrew";
    var options = this.props.options.map(function(option, i) {

      let alignStyle;
      if (i == this.props.options.length -1) { alignStyle = styles.readerDisplayOptionsMenuItemRight; }
      else if (i == 0)                       { alignStyle = styles.readerDisplayOptionsMenuItemLeft; }
      else                                   { alignStyle = styles.readerDisplayOptionsMenuItemCenter; }

      var itemStyles = [styles.readerDisplayOptionsMenuItem, this.props.theme.readerDisplayOptionsMenuItem, alignStyle];
      itemStyles = itemStyles.concat(this.props.active === option.name ? [this.props.theme.readerDisplayOptionsMenuItemSelected] : []);
      return (
        <TouchableOpacity onPress={option.onPress} key={i} style={itemStyles} >
          {showHebrew ?
            <Text style={[styles.heInt, this.props.theme.tertiaryText]}>{option.text}</Text> :
            <Text style={[styles.enInt, this.props.theme.tertiaryText]}>{option.text}</Text> }
        </TouchableOpacity>
      );
    }.bind(this));

    return (<View style={[styles.readerDisplayOptionsMenuRow,
                          styles.readerDisplayOptionMenuRowNotColor,
                          this.props.theme.readerDisplayOptionsMenuDivider,
                          styles.buttonToggleSet]}>
              {options}
            </View>);
  }
}

class LoadingView extends React.Component {
  render() {
    return ( <View style={[styles.loadingViewBox, this.props.style]}>
                <ActivityIndicator
                  animating={true}
                  style={styles.loadingView}
                  size="large" />
             </View> );
  }
}

class IndeterminateCheckBox extends React.Component {
  static propTypes = {
    themeStr:   PropTypes.string.isRequired,
    state:      PropTypes.oneOf([0,1,2]),
    onPress:    PropTypes.func.isRequired,
  };

  render() {
    var src;
    if (this.props.state === 1) {
      if (this.props.themeStr == "white") {
        src = require('./img/checkbox-checked.png');
      } else {
        src = require('./img/checkbox-checked-light.png');
      }
    } else if (this.props.state === 0) {
      if (this.props.themeStr == "white") {
        src = require('./img/checkbox-unchecked.png');
      } else {
        src = require('./img/checkbox-unchecked-light.png');
      }
    } else {
      if (this.props.themeStr == "white") {
        src = require('./img/checkbox-partially.png');
      } else {
        src = require('./img/checkbox-partially-light.png');
      }
    }

    return (
      <TouchableOpacity onPress={this.props.onPress}>
        <Image source={src}
          resizeMode={Image.resizeMode.contain}
          style={styles.searchFilterCheckBox} />
      </TouchableOpacity>
    );
  }
}

export {
  AnimatedRow,
  ButtonToggleSet,
  CategoryBlockLink,
  CategoryAttribution,
  CategoryColorLine,
  CategorySideColorLink,
  CloseButton,
  CollapseIcon,
  DirectedArrow,
  DirectedButton,
  DisplaySettingsButton,
  IndeterminateCheckBox,
  LanguageToggleButton,
  LibraryNavButton,
  LoadingView,
  MenuButton,
  SearchButton,
  SefariaProgressBar,
  ToggleSet,
  TripleDots,
  TwoBox,
}
