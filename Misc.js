'use strict';

import PropTypes from 'prop-types';

import React, { useContext } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableHighlight,
  View,
  Image,
  ActivityIndicator,
  ViewPropTypes,
  Animated,
  Platform,
} from 'react-native';
import { GlobalStateContext } from './StateManager';
import Sefaria from './sefaria';
import styles from './Styles.js';
import strings from './LocalizedStrings';


const SystemButton = ({ onPress, text, img, isHeb, isBlue }) => (
  <GlobalStateContext.Consumer>
    { ({ theme }) => (
      <TouchableOpacity onPress={onPress} style={[styles.systemButton, styles.boxShadow, (isBlue ? styles.systemButtonBlue : null)]}>
        { !!img ?
          <Image
            source={img}
            style={isHeb ? styles.menuButtonMarginedHe : styles.menuButtonMargined}
            resizeMode={'contain'}
          /> : null
        }
        <Text
          style={[
            styles.systemButtonText,
            (isBlue ? styles.systemButtonTextBlue : null),
            (isHeb ? styles.heInt : styles.enInt)
          ]}
        >
          { text }
        </Text>
        { !!img ?
          <Image
            source={img}
            style={[(isHeb ? styles.menuButtonMarginedHe : styles.menuButtonMargined), { opacity: 0 }]}
            resizeMode={'contain'}
          /> : null
        }
      </TouchableOpacity>
    )}
  </GlobalStateContext.Consumer>

);

const SefariaProgressBar = ({ progress, onPress, onClose }) => (
  <GlobalStateContext.Consumer>
    { ({ theme, themeStr, interfaceLanguage }) => (
      <TouchableOpacity onPress={!!onPress ? onPress : ()=>{}} disabled={!onPress} style={styles.sefariaProgressBar}>
        <View style={{flex: 1, flexDirection: interfaceLanguage === "hebrew" ? "row-reverse" : "row", height: 50}}>
          <View style={{flex: progress, backgroundColor: "#fff"}}>
          </View>
          <View style={{flex: 1-progress, backgroundColor: "#eee"}}>
          </View>
        </View>
        <View style={[{flexDirection: interfaceLanguage === "hebrew" ? "row-reverse" : "row"}, styles.sefariaProgressBarOverlay]}>
          <Text style={[{color: "#999"}, interfaceLanguage === "hebrew" ? styles.heInt : styles.enInt]}>{`${strings.downloading} (${Math.round(progress*1000)/10}%)`}</Text>
          {!!onClose ?
            <TouchableOpacity onPress={onClose}>
              <Image
                source={themeStr === 'white' ? require('./img/close.png') : require('./img/close-light.png')}
                resizeMode={'contain'}
                style={{width: 14, height: 14}}
              />
            </TouchableOpacity>
            : null
          }
        </View>
      </TouchableOpacity>
    )}
  </GlobalStateContext.Consumer>
);

class TwoBox extends React.Component {
  static propTypes = {
    language: PropTypes.oneOf(["hebrew","english"]),
  };

  render() {
      const rows = [];
      let currRow = [];
      const numChildren = React.Children.count(this.props.children);
      React.Children.forEach(this.props.children, (child, index) => {
        currRow.push(child);
        if (currRow.length === 2 || index === numChildren - 1) {
          rows.push(
            <TwoBoxRow key={index} language={this.props.language}>
              { currRow }
            </TwoBoxRow>
          );
          currRow = [];
        }
      });
      return (<View style={styles.twoBox}>{rows}</View>);
  }
}

class TwoBoxRow extends React.PureComponent {
  static propTypes = {
    language: PropTypes.oneOf(["hebrew","english"]),
  };
  render() {
    const { children, language } = this.props;
    const rowStyle = language == "hebrew" ? [styles.twoBoxRow, styles.rtlRow] : [styles.twoBoxRow];
    const numChildren = React.Children.count(children);
    const newChildren = React.Children.map(children, (child, index) => (
      <View style={styles.twoBoxItem} key={index}>{child}</View>
    ));
    if (numChildren < 2) {
      newChildren.push(<View style={styles.twoBoxItem} key={1}></View>);
    }
    return (
      <View style={rowStyle}>
        { newChildren }
      </View>
    );
  }
}

const CategoryBlockLink = ({
  category,
  heCat,
  style,
  icon,
  iconSide,
  subtext,
  upperCase,
  withArrow,
  isSans,
  onPress,
}) => {
  const { theme, themeStr, menuLanguage } = useContext(GlobalStateContext);
  const isHeb = menuLanguage == "hebrew";
  const iconOnLeft = iconSide ? iconSide === "start" ^ isHeb : isHeb;
  style  = style || {"borderColor": Sefaria.palette.categoryColor(category)};
  var enText = upperCase ? category.toUpperCase() : category;
  var heText = heCat || Sefaria.hebrewCategory(category);
  subtext = !!subtext && !(subtext instanceof Array) ? [subtext] : subtext;
  var textStyle  = [styles.centerText, theme.text, upperCase ? styles.spacedText : null];
  var content = isHeb ?
    (<Text style={[isSans ? styles.heInt : styles.hebrewText].concat(textStyle)}>{heText}</Text>) :
    (<Text style={[isSans ? styles.enInt : styles.englishText].concat(textStyle)}>{enText}</Text>);
  return (
    <TouchableOpacity onPress={onPress} style={[styles.readerNavCategory, theme.readerNavCategory, style]}>
      <View style={styles.readerNavCategoryInner}>
        { iconOnLeft && (withArrow || icon) ? <Image source={withArrow || !icon ? (themeStr == "white" ? require('./img/back.png') : require('./img/back-light.png')) : icon }
          style={[styles.moreArrowHe, isSans ? styles.categoryBlockLinkIconSansHe : null]}
          resizeMode={'contain'} /> : null }
        {content}
        { !iconOnLeft && (withArrow || icon) ? <Image source={ withArrow || !icon ? (themeStr == "white" ? require('./img/forward.png'): require('./img/forward-light.png')) : icon }
          style={[styles.moreArrowEn, isSans ? styles.categoryBlockLinkIconSansEn : null]}
          resizeMode={'contain'} /> : null }
      </View>
      {
        !!subtext ?
          <View style={styles.readerNavCategorySubtext}>
            { subtext.map(x => (
              <Text
                key={x.en}
                style={[isHeb ? styles.hebrewText : styles.englishText, {textAlign: "center"}, theme.secondaryText]}
              >
                {isHeb ? x.he : x.en}
              </Text>
            )) }
          </View>
        : null
      }
    </TouchableOpacity>
  );
}
CategoryBlockLink.propTypes = {
  category:  PropTypes.string,
  heCat:     PropTypes.string,
  language:  PropTypes.string,
  style:     PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  isSans:    PropTypes.bool,
  upperCase: PropTypes.bool,
  withArrow: PropTypes.bool,
  subtext:   PropTypes.oneOfType([PropTypes.shape({en: PropTypes.string, he: PropTypes.string}), PropTypes.arrayOf(PropTypes.shape({en: PropTypes.string, he: PropTypes.string}))]),
  onPress:   PropTypes.func,
  icon:      PropTypes.number,
  iconSide:  PropTypes.oneOf(["start", "end"])
};


const CategorySideColorLink = ({ language, category, enText, heText, onPress }) => {
  const { theme, themeStr } = useContext(GlobalStateContext);
  const isHeb = language === 'hebrew';
  const borderSide = isHeb ? "Right" : "Left";
  const text = isHeb ? (heText || Sefaria.hebrewCategory(category)) : enText;
  return (
    <TouchableHighlight underlayColor={themeStr} style={{flex:1}} onPress={onPress}>
      <View style={{flex:1, flexDirection: isHeb ? "row-reverse" : "row"}}>
        <View style={{width: 6, [`border${borderSide}Color`]: Sefaria.palette.categoryColor(category), [`border${borderSide}Width`]: 6,}} />
        <View style={[styles.categorySideColorLink, theme.menu, theme.borderedBottom]}>
          <Text numberOfLines={1} ellipsizeMode={"middle"} style={[isHeb ? styles.hebrewText : styles.englishText, theme.text]}>{text}</Text>
        </View>
      </View>
    </TouchableHighlight>
  );
}
CategorySideColorLink.propTypes = {
  language:   PropTypes.string.isRequired,
  category:   PropTypes.string.isRequired,
  enText:     PropTypes.string.isRequired,
  heText:     PropTypes.string,
  onPress:    PropTypes.func.isRequired,
};

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
      ]).start(onRemove);
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

const CategoryAttribution = ({ categories, context, linked=true, openUri }) => {
  const { theme, menuLanguage } = useContext(GlobalStateContext);
  if (!categories) { return null; }
  var attribution = Sefaria.categoryAttribution(categories);
  if (!attribution) { return null; }

  var openLink = () => {openUri(attribution.link)};
  var boxStyles = [styles.categoryAttribution, styles[context + "CategoryAttribution" ]];
  var content = menuLanguage == "english" ?
              <Text style={[styles[context + "CategoryAttributionTextEn"], theme.tertiaryText]}>{attribution.english}</Text> :
              <Text style={[styles[context + "CategoryAttributionTextHe"], theme.tertiaryText]}>{attribution.hebrew}</Text>;

  return linked ?
    (<TouchableOpacity style={boxStyles} onPress={openLink}>
      {content}
    </TouchableOpacity>) :
    (<View style={boxStyles}>
      {content}
    </View>);
}
CategoryAttribution.propTypes = {
  categories: PropTypes.array,
  context:    PropTypes.string.isRequired,
  linked:     PropTypes.bool,
  openUri:    PropTypes.func,
};

const LibraryNavButton = ({
  catColor,
  onPress,
  onPressCheckBox,
  checkBoxSelected,
  enText,
  heText,
  count,
  withArrow,
  buttonStyle,
}) => {
  const { theme, themeStr, menuLanguage } = useContext(GlobalStateContext);
  let colorStyle = catColor ? [{"borderColor": catColor}] : [theme.searchResultSummary, {"borderTopWidth": 1}];
  let textStyle  = [catColor ? styles.spacedText : null];
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
              !!count ? <Text style={[styles.hebrewText].concat([theme.secondaryText, textStyle])}>{`(${count})`}</Text> : null
            }
          </Text>
        }
      </View>
      { withArrow ?
        <DirectedArrow themeStr={themeStr} imageStyle={{opacity: 0.5}} language={menuLanguage} direction={"forward"} />
        : null
      }
   </TouchableOpacity>
 );
}
LibraryNavButton.propTypes = {
  catColor:        PropTypes.string,
  onPress:         PropTypes.func.isRequired,
  onPressCheckBox: PropTypes.func,
  checkBoxSelected:PropTypes.number,
  enText:          PropTypes.string.isRequired,
  heText:          PropTypes.string.isRequired,
  count:           PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  withArrow:       PropTypes.bool.isRequired,
  buttonStyle:     PropTypes.oneOfType([ViewPropTypes.style, PropTypes.array]),
};

const LanguageToggleButton = ({ language, toggleLanguage }) => {
  const { theme, interfaceLanguage } = useContext(GlobalStateContext);
  const content = language == "hebrew" ?
      (<Text style={[styles.languageToggleTextEn, theme.languageToggleText, styles.en]}>A</Text>) :
      (<Text style={[styles.languageToggleTextHe, theme.languageToggleText, styles.he]}>א</Text>);
  const style = [styles.languageToggle, theme.languageToggle, interfaceLanguage === "hebrew" ? {opacity:0} : null];
  return (
    <TouchableOpacity style={style} onPress={interfaceLanguage === "hebrew" ? null : toggleLanguage}>
      {content}
    </TouchableOpacity>
  );
}
LanguageToggleButton.propTypes = {
  language:       PropTypes.string.isRequired,
  toggleLanguage: PropTypes.func.isRequired,
};

const CollapseIcon = ({ showHebrew, isVisible }) => {
  const { themeStr } = useContext(GlobalStateContext);
  var src;
  if (themeStr == "white") {
    if (isVisible) {
      src = require('./img/down.png');
    } else {
      if (showHebrew) {
        src = require('./img/back.png');
      } else {
        src = require('./img/forward.png');
      }
    }
  } else {
    if (isVisible) {
      src = require('./img/down-light.png');
    } else {
      if (showHebrew) {
        src = require('./img/back-light.png');
      } else {
        src = require('./img/forward-light.png');
      }
    }
  }
  return (
    <Image
      source={src}
      style={(showHebrew ? styles.collapseArrowHe : styles.collapseArrowEn)}
      resizeMode={'contain'}
    />
  );
}
CollapseIcon.propTypes = {
  showHebrew:  PropTypes.bool,
  isVisible: PropTypes.bool
};

class DirectedButton extends React.Component {
  //simple button with onPress() and a forward/back arrow. NOTE: arrow should change direction depending on interfaceLang
  static propTypes = {
    text:       PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
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
        style={{ flexDirection: actualDirBack ? "row-reverse" : "row", alignItems: "center" }}
        hitSlop={{top: 20, bottom: 20, left: 10, right: 10}}>
        { this.props.text ?
          <SText lang={this.props.language} style={this.props.textStyle}>
            {this.props.text}
          </SText> :
          null
        }
        <DirectedArrow
          imageStyle={this.props.imageStyle}
          language={this.props.language}
          direction={this.props.direction} />
      </TouchableOpacity>
    );
  }
}

const DirectedArrow = ({ imageStyle, language, direction }) => {
  const { themeStr } = useContext(GlobalStateContext);
  var actualDirBack = (language === "hebrew"  && direction === "forward") || (language === "english" && direction === "back")
  //I wish there was a way to reduce these if statements, but there's a limitation that require statements can't have variables in them
  var src;
  if (actualDirBack) {
    if (themeStr === "white") {
      src = require("./img/back.png");
    } else {
      src = require("./img/back-light.png");
    }
  } else {
    if (themeStr === "white") {
      src = require("./img/forward.png");
    } else {
      src = require("./img/forward-light.png");
    }
  }
  return (
    <Image source={src} style={imageStyle} resizeMode={'contain'}/>
  );
}
DirectedArrow.propTypes = {
  imageStyle:   PropTypes.oneOfType([ViewPropTypes.style, PropTypes.array]),
  language:     PropTypes.oneOf(["hebrew", "english"]).isRequired,
  direction:  PropTypes.oneOf(["forward", "back"]).isRequired,
};

const SearchButton = ({ onPress }) => {
  const { themeStr } = useContext(GlobalStateContext);
  return (
    <TouchableOpacity style={[styles.headerButton, styles.headerButtonSearch]} onPress={onPress}>
      <Image
        source={themeStr == "white" ? require('./img/search.png'): require('./img/search-light.png') }
        style={styles.searchButton}
        resizeMode={'contain'}
      />
    </TouchableOpacity>
  );
}

const MenuButton = ({ onPress }) => {
  const { themeStr } = useContext(GlobalStateContext);
  return (
    <TouchableOpacity style={[styles.headerButton, styles.leftHeaderButton]} onPress={onPress}>
      <Image
        source={themeStr == "white" ? require('./img/menu.png'): require('./img/menu-light.png') }
        style={styles.menuButton}
        resizeMode={'contain'}
      />
    </TouchableOpacity>
  );
}

const CloseButton = ({ onPress }) => {
  const { themeStr } = useContext(GlobalStateContext);
  return (
    <TouchableOpacity style={[styles.headerButton, styles.leftHeaderButton]} onPress={onPress}>
      <Image
        source={themeStr == "white" ? require('./img/close.png'): require('./img/close-light.png') }
        style={styles.closeButton}
        resizeMode={'contain'}
      />
    </TouchableOpacity>
  );
}

const CircleCloseButton = ({ onPress }) => {
  const { themeStr } = useContext(GlobalStateContext);
  return (
    <TouchableOpacity style={styles.headerButton} onPress={onPress}>
      <Image
        source={themeStr == "white" ? require('./img/circle-close.png'): require('./img/circle-close-light.png') }
        style={styles.circleCloseButton}
        resizeMode={'contain'}
      />
    </TouchableOpacity>
  );
}

const TripleDots = ({ onPress }) => {
  const { themeStr } = useContext(GlobalStateContext);
  return (
    <TouchableOpacity
      style={styles.tripleDotsContainer}
      onPress={onPress}
    >
      <Image
        style={styles.tripleDots}
        source={themeStr == "white" ? require('./img/dots.png'): require('./img/dots-light.png') }
      />
    </TouchableOpacity>
  );
}

const DisplaySettingsButton = ({ onPress }) => {
  const { themeStr } = useContext(GlobalStateContext);
  return (
    <TouchableOpacity
      style={[styles.headerButton, styles.rightHeaderButton]}
      onPress={onPress}
    >
      <Image
        source={themeStr == "white" ? require('./img/a-aleph.png'): require('./img/a-aleph-light.png') }
        style={styles.displaySettingsButton}
        resizeMode={'contain'}
      />
    </TouchableOpacity>
  );
}

const ToggleSet = ({ options, active }) => {
  const { theme, menuLanguage } = useContext(GlobalStateContext);
  const showHebrew = menuLanguage == "hebrew";
  options = options.map((option, i) => {
    var style = [styles.navToggle, theme.navToggle].concat(active === option.name ? [styles.navToggleActive, theme.navToggleActive] : []);
    return (
      <TouchableOpacity onPress={option.onPress} key={i} >
        {showHebrew ?
          <Text style={[style, styles.heInt]}>{option.heText}</Text> :
          <Text style={[style, styles.enInt]}>{option.text}</Text> }
      </TouchableOpacity>
    );
  });

  var dividedOptions = [];
  for (var i = 0; i < options.length; i++) {
    dividedOptions.push(options[i])
    dividedOptions.push(<Text style={[styles.navTogglesDivider,theme.navTogglesDivider]} key={i+"d"}>|</Text>);
  }
  dividedOptions = dividedOptions.slice(0,-1);

  return (
    <View style={styles.navToggles}>
      {dividedOptions}
    </View>
  );
}
ToggleSet.propTypes = {
  options:     PropTypes.array.isRequired, // array of object with `name`. `text`, `heText`, `onPress`
  active:      PropTypes.string.isRequired
};

const ButtonToggleSet = ({ options, active }) => {
  const { theme, interfaceLanguage } = useContext(GlobalStateContext);
  var showHebrew = interfaceLanguage == "hebrew";
  options = options.map((option, i) => {

    let alignStyle;
    if (i == options.length -1) { alignStyle = styles.readerDisplayOptionsMenuItemRight; }
    else if (i == 0)            { alignStyle = styles.readerDisplayOptionsMenuItemLeft; }
    else                        { alignStyle = styles.readerDisplayOptionsMenuItemCenter; }

    var itemStyles = [styles.readerDisplayOptionsMenuItem, theme.readerDisplayOptionsMenuItem, alignStyle];
    itemStyles = itemStyles.concat(active === option.name ? [theme.readerDisplayOptionsMenuItemSelected] : []);
    return (
      <TouchableOpacity onPress={option.onPress} key={i} style={itemStyles} >
        {showHebrew ?
          <Text style={[styles.heInt, theme.tertiaryText]}>{option.text}</Text> :
          <Text style={[styles.enInt, theme.tertiaryText]}>{option.text}</Text> }
      </TouchableOpacity>
    );
  });

  return (
    <View style={[styles.readerDisplayOptionsMenuRow, styles.buttonToggleSet]}>
      {options}
    </View>
  );
}
ButtonToggleSet.propTypes = {
  options:     PropTypes.array.isRequired, // array of object with `name`. `text`, `onPress`
  active:      PropTypes.oneOfType([PropTypes.bool, PropTypes.string])
};

const LoadingView = ({ style, category }) => (
  <View style={[styles.loadingViewBox, style]}>
    <ActivityIndicator
      animating={true}
      style={styles.loadingView}
      color={Platform.OS === 'android' ? Sefaria.palette.categoryColor(category) : undefined}
      size="large"
    />
  </View>
);

const IndeterminateCheckBox = ({ state, onPress }) => {
  const { themeStr } = useContext(GlobalStateContext);
  var src;
  if (state === 1) {
    if (themeStr == "white") {
      src = require('./img/checkbox-checked.png');
    } else {
      src = require('./img/checkbox-checked-light.png');
    }
  } else if (state === 0) {
    if (themeStr == "white") {
      src = require('./img/checkbox-unchecked.png');
    } else {
      src = require('./img/checkbox-unchecked-light.png');
    }
  } else {
    if (themeStr == "white") {
      src = require('./img/checkbox-partially.png');
    } else {
      src = require('./img/checkbox-partially-light.png');
    }
  }

  return (
    <TouchableOpacity onPress={onPress}>
      <Image source={src}
        resizeMode={'contain'}
        style={styles.searchFilterCheckBox} />
    </TouchableOpacity>
  );
}
IndeterminateCheckBox.propTypes = {
  state:      PropTypes.oneOf([0,1,2]),
  onPress:    PropTypes.func.isRequired,
};

class RainbowBar extends React.Component {
  render() {
    const colors = [
      "darkteal",
      "lightblue",
      "yellow",
      "green",
      "red",
      "purple",
      "darkpink",
      "lavender",
      "teal",
      "darkblue",
    ]
    const bars = colors.map(color=>(
        <View style={{backgroundColor: Sefaria.palette.colors[color], height: 8, flexGrow: 1}} key={color}/>)
    );
    return (
      <View style={styles.rainbowBar} >
        {bars}
      </View>
    )
  }
}
class HebrewInEnglishText extends React.Component {
  //Use Sefaria.util.hebrewInEnglish for HTML text in a text or sheet segment. This is for other react components

  cleanText(text){
      var splitText = Sefaria.util.hebrewInEnglish(Sefaria.util.stripHtml(text),"list")
      var cleanText = []
      for (let chunk of splitText) {
          if (Sefaria.hebrew.isHebrew(chunk)) {
            cleanText.push(<Text style={this.props.stylesHe}>{chunk}</Text>)
          }
          else {
              cleanText.push(<Text style={this.props.stylesEn}>{chunk}</Text>)
          }
      }
      return cleanText
  }

  render() {
      return this.cleanText(this.props.text)
  }

}

class SText extends React.Component {
  static propTypes = {
    children: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    lang:     PropTypes.oneOf(["hebrew", "english"]),
    style:    PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  }

  fsize2lheight = (fsize, lang) => (
    lang === "english" ? (fsize * 2) - 4 : (fsize) + 2 // very naive guess at what the function should be (17 == 30, 16 == 28)
  );

  getFontSize = (style, lang) => {
    let fsize = 14;  // default font size in rn (i believe)
    for (let s of style) {
      if (!!s && !!s.fontSize) { fsize = s.fontSize; }
    }
    fsize = lang === "hebrew" ? fsize * 1.2 : fsize;
    return fsize;
  }

  render() {
    const { style, lang, children } = this.props;
    const styleArray = Array.isArray(style) ? style : [style];
    const fontSize = this.getFontSize(styleArray, lang);
    return (
      <Text {...this.props} style={styleArray.concat([{lineHeight: this.fsize2lheight(fontSize, lang)}])}>
        { children }
      </Text>
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
  CircleCloseButton,
  CloseButton,
  CollapseIcon,
  DirectedArrow,
  DirectedButton,
  DisplaySettingsButton,
  HebrewInEnglishText,
  IndeterminateCheckBox,
  LanguageToggleButton,
  LibraryNavButton,
  LoadingView,
  MenuButton,
  RainbowBar,
  SearchButton,
  SefariaProgressBar,
  SText,
  SystemButton,
  ToggleSet,
  TripleDots,
  TwoBox,
  TwoBoxRow,
}
