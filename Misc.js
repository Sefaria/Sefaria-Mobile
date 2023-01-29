'use strict';

import PropTypes from 'prop-types';

import React, { useContext, useState, useEffect, useReducer, useCallback } from 'react';
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
  TextInput,
  Pressable,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { GlobalStateContext, DispatchContext, STATE_ACTIONS, themeStr, getTheme } from './StateManager';
import { useGlobalState, useRenderersProps } from './Hooks';
import Sefaria from './sefaria';
import styles from './Styles.js';
import {iconData } from "./IconData";
import strings from './LocalizedStrings';
import { useHTMLViewStyles } from './useHTMLViewStyles';
import { RenderHTML } from 'react-native-render-html';

const SYSTEM_FONTS = ["Taamey Frank Taamim Fix", "Amiri", "Heebo", "OpenSans", "SertoBatnan"];  // list of system fonts. needed for RenderHTML
const CSS_CLASS_STYLES = {
  hebrew: {
    fontFamily: "Taamey Frank Taamim Fix",
    writingDirection: "rtl",
    flex: -1,
    paddingTop: 15,
    textAlign: Platform.OS == "android" ? "right" : "justify",
  },
  english: {
    fontFamily: "Amiri",
    fontWeight: "normal",
    textAlign: 'justify',
    paddingTop: 0,
  },
};

const SystemHeader = ({ title, onBack, openNav, hideLangToggle }) => {
  const { themeStr, interfaceLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const showMenu = Platform.OS === 'android';
  const LeftButtonComponent = showMenu ? MenuButton : DirectedButton;
  const leftButtonProps = showMenu ? {onPress: openNav} : {
    onPress: onBack,
    imageStyle: [styles.menuButton, styles.directedButton],
    direction: "back",
    language: "english"
  };
  return (
    <View style={[styles.header, styles.boxShadow, {borderBottomWidth: 0}, theme.header]}>
      <LeftButtonComponent
        {...leftButtonProps}
      />
      <Text style={[interfaceLanguage === 'hebrew' ? styles.intHe : styles.intEn, styles.categoryTitle, theme.categoryTitle, {textTransform: "uppercase"}]}>
        {title}
      </Text>
      { hideLangToggle ? (
        <LeftButtonComponent
          {...leftButtonProps}
          placeholder
        />
      ) : <LanguageToggleButton /> }
    </View>
  );
};

const InterfaceTextWithFallback = ({ en, he, extraStyles=[], lang }) => {
  const { interfaceLanguage } = useContext(GlobalStateContext);
  let langStyle = styles.enInt;
  let text = en;
  lang = lang || interfaceLanguage;
  if ((lang === 'english' && !en) || (lang === 'hebrew' && !!he)) {
    langStyle = styles.heInt;
    text = he;
  }
  return (
    <Text style={[langStyle].concat(extraStyles)}>{text}</Text>
  );
}

const ContentTextWithFallback = ({ en, he, extraStyles=[], lang, ...stextProps }) => {
  // default lang still governed by interfaceLanguage, but styles reflect content text styles
  const { interfaceLanguage } = useContext(GlobalStateContext);
  let langStyle = styles.ContentBodyEn;
  let text = en;
  lang = lang || interfaceLanguage
  if ((lang === 'english' && !en) || (lang === 'hebrew' && !!he)) {
    langStyle = styles.ContentBodyHe;
    text = he;
  }
  return (
    <SText lang={lang} style={[langStyle].concat(extraStyles)} {...stextProps} lineMultiplier={1.1}>{text}</SText>
  );
}

const OrderedList = ({items, renderItem}) => {
  let arrayOffset = 0;
  return (
    <>
      {
        items.map((item, index) => {
          if (Array.isArray(item)) {
            arrayOffset += 1;
            return (
              <View style={{marginLeft: 10}} key={`wrapper|${index}`}>
                <OrderedList renderItem={renderItem} items={item}/>
              </View>
            );
          }
          return renderItem(item, index-arrayOffset);
        })
      }
    </>
  );
}

const DotSeparatedList = ({ items, renderItem, keyExtractor, flexDirection='row' }) => {
  return (
    items.map((item, i) => (
      <View key={keyExtractor(item)} style={{flexDirection, alignItems: 'center'}} accessibilityLabel="A horizontal list of items separated by bullets">
        { renderItem(item, i) }
        { i < (items.length - 1) ? <Image source={require('./img/dot.png')} resizeMode={'contain'} style={{marginHorizontal: 5}}/> : null}
      </View>
    ))
  );
};

const SystemButton = ({ onPress, text, img, isHeb, isBlue, isLoading, extraStyles=[], extraImageStyles=[], placeholderImg=true }) => {
  const { theme } = useGlobalState();
  const flexDirection = isHeb ? "row-reverse" : "row";
  return (
    <TouchableOpacity disabled={isLoading} onPress={onPress} style={[styles.systemButton, theme.mainTextPanel, styles.boxShadow, (isBlue ? styles.systemButtonBlue : null)].concat(extraStyles)}>
      { isLoading ?
        (<LoadingView size={'small'} height={20} color={isBlue ? '#ffffff' : undefined} />) :
        (<View style={[styles.systemButtonInner, {flexDirection}]}>
          { !!img ?
            <Image
              source={img}
              style={[isHeb ? styles.menuButtonMarginedHe : styles.menuButtonMargined].concat(extraImageStyles)}
              resizeMode={'contain'}
            /> : null
          }
          <Text
            style={[
              styles.systemButtonText,
              theme.text,
              (isBlue ? styles.systemButtonTextBlue : null),
              (isHeb ? styles.heInt : styles.enInt)
            ]}
          >
            { text }
          </Text>
          { !!img && placeholderImg ?
            <Image
              source={img}
              style={[isHeb ? styles.menuButtonMarginedHe : styles.menuButtonMargined, {opacity: 0}].concat(extraImageStyles)}
              resizeMode={'contain'}
            /> : null
          }
        </View>)
      }
    </TouchableOpacity>
  );
}
SystemButton.whyDidYouRender = true;

const DynamicRepeatingText = ({ displayText, repeatText, maxCount }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const intervalId = setInterval(() => setCount(count => count + 1), 1000);
    return () => clearInterval(intervalId);
  }, []);
  return <Text>{`${displayText}${repeatText.repeat(Math.abs(count%(maxCount+1)))}`}</Text>
};

const SefariaProgressBar = ({ onPress, onClose, download, downloadNotification, identity, downloadSize }) => {
  /*
   * note on configuration: an object with keys {count, interval}. Count is the max number of times the progress bar
   * will update, interval is the minimum elapsed time (ms) between updates. Hardcoding now, but we can turn this into a
   * prop if needed.
   * Configuration is supported by rn-fetch-blob. As the progressBar is designed to listen to the state of an ongoing
   * process, I imagine this will generally be listening to libraries that support Stateful Promises. This can be
   * revisited if reuseability becomes a problem.
   */
  const { theme, interfaceLanguage } = useGlobalState();
  const [ progress, setProgress ] = useState(0);
  const calculateProgress = (received, total) => !!(received) ? setProgress(received / total) : setProgress(0.0);
  const downloadActive = !!downloadNotification ? downloadNotification.downloadActive : false;
  const trueDownloadSize = !!(downloadSize) ? downloadSize : download.downloadSize;

  useEffect(() => {
    console.log('attaching Progress Tracker');
    download.attachProgressTracker(calculateProgress, identity);
    return function cleanup() {
      console.log('attaching dummy Progress Tracker');
      download.removeProgressTracker(identity);

    };
  }, [download]);  // we only want to resubscribe if the downloader object changes. This shouldn't happen, but the condition is here for completeness sake
  const downloadPercentage = (Math.round(progress * 1000) / 10).toFixed(1);
  return (
    <TouchableOpacity onPress={!!onPress ? onPress : () => {
      }} disabled={!onPress} style={styles.sefariaProgressBar}>
        <View style={{flex: 1, flexDirection: interfaceLanguage === "hebrew" ? "row-reverse" : "row", height: 50, alignSelf: 'stretch'}}>
          <View style={[{flex: progress}, theme.mainTextPanel]}>
          </View>
          <View style={[{flex: 1 - progress}, theme.lighterGreyBackground]}>
          </View>
        </View>
        <View
          style={[{flexDirection: interfaceLanguage === "hebrew" ? "row-reverse" : "row"}, styles.sefariaProgressBarOverlay]}>
          <Text
            style={[{color: "#999"}, interfaceLanguage === "hebrew" ? styles.heInt : styles.enInt]}>{
              downloadActive ? `${strings.downloading} (${downloadPercentage}% ${strings.of} ${parseInt(trueDownloadSize/ 1e6)}mb)`
                :  <DynamicRepeatingText displayText={strings.connecting} repeatText={'.'} maxCount={3} />
          }</Text>
          {!!onClose ?
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
              <Image
                source={iconData.get('close', themeStr)}
                resizeMode={'contain'}
                style={{width: 14, height: 14}}
              />
            </TouchableOpacity>
            : null
          }
        </View>
      </TouchableOpacity>
    );
};

const ConditionalProgressWrapper = ({ conditionMethod, initialValue, downloader, listenerName, children, ...otherProps }) => {
  const enclosedCondition = state => {
    return conditionMethod(state, otherProps)
  };
  const [downloadState, setDownload] = useState(initialValue);
  useEffect(() => {
    downloader.subscribe(listenerName, setDownload);
    return function cleanup() {
      downloader.unsubscribe(listenerName);
    }
  }, []);
  if(enclosedCondition(downloadState)) {
    return React.cloneElement(children, {downloadNotification: downloadState})
  } else { return null }
};

class TwoBox extends React.Component {
  static propTypes = {
    language: PropTypes.oneOf(["hebrew", "bilingual", "english"]),
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
    language: PropTypes.oneOf(["hebrew","bilingual", "english"]),
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
  onLongPress,
}) => {
  const { themeStr, textLanguage, interfaceLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const isHeb = Sefaria.util.get_menu_language(interfaceLanguage, textLanguage) == 'hebrew';
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
    <TouchableOpacity onLongPress={onLongPress} onPress={onPress} style={[styles.readerNavCategory, theme.readerNavCategory, style]}>
      <View style={styles.readerNavCategoryInner}>
        { iconOnLeft && (withArrow || icon) ? <Image source={withArrow || !icon ? iconData.get('back', themeStr) : icon }
          style={[styles.moreArrowHe, isSans ? styles.categoryBlockLinkIconSansHe : null]}
          resizeMode={'contain'} /> : null }
        {content}
        { !iconOnLeft && (withArrow || icon) ? <Image source={ withArrow || !icon ? iconData.get('forward', themeStr) : icon }
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
CategoryBlockLink.whyDidYouRender = true;

const CategorySideColorLink = ({ language, category, enText, heText, sheetOwner, onPress }) => {
  const { themeStr } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const isHeb = language === 'hebrew';
  const borderSide = isHeb ? "Right" : "Left";
  const text = isHeb ? (heText || Sefaria.hebrewCategory(category)) : enText;
  return (
    <TouchableHighlight underlayColor={themeStr} style={{flex:1}} onPress={onPress}>
      <View style={{flex:1, flexDirection: isHeb ? "row-reverse" : "row"}}>
        <View style={{width: 6, [`border${borderSide}Color`]: Sefaria.palette.categoryColor(category), [`border${borderSide}Width`]: 6,}} />
        <View style={[styles.categorySideColorLink, theme.menu, theme.borderedBottom]}>
          <Text numberOfLines={1} ellipsizeMode={"middle"} style={[isHeb ? styles.hebrewText : styles.englishText, theme.text]}>
            {text}
            <Text style={isHeb ? {fontWeight: 'bold'} : {fontStyle: 'italic'}}>
              {sheetOwner}
            </Text>
          </Text>
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
          useNativeDriver: false,
        }),
        Animated.timing(this._height, {
          toValue: 0,
          duration: animationDuration,
          useNativeDriver: false,
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
  const { themeStr, textLanguage, interfaceLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  // language settings in TextColumn should be governed by textLanguage. Everything else should be governed by textLanguage
  if (!categories) { return null; }
  var attribution = Sefaria.categoryAttribution(categories);
  if (!attribution) { return null; }

  var openLink = () => {openUri(attribution.link)};
  var boxStyles = [styles.categoryAttribution, styles[context + "CategoryAttribution" ]];
  var content = Sefaria.util.get_menu_language(interfaceLanguage, textLanguage) == "hebrew" ?
              <Text style={[styles[context + "CategoryAttributionTextHe"], theme.tertiaryText]}>{attribution.hebrew}</Text> :
              <Text style={[styles[context + "CategoryAttributionTextEn"], theme.tertiaryText]}>{attribution.english}</Text>;

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
  hasEn,
  withArrow,
  buttonStyle,
}) => {
  const { themeStr, textLanguage, interfaceLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  let colorStyle = catColor ? [{"borderColor": catColor}] : [theme.searchResultSummary, {"borderTopWidth": 1}];
  let textStyle  = [catColor ? styles.spacedText : null];
  const isHeb = Sefaria.util.get_menu_language(interfaceLanguage, textLanguage) == "hebrew";
  let flexDir = isHeb ? "row-reverse" : "row";
  let textMargin = !!onPressCheckBox ? { marginHorizontal: 0 } : styles.readerSideMargin;
  if (count === 0) { textStyle.push(theme.secondaryText); }
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.searchFilterCat, {flexDirection: flexDir}, buttonStyle].concat(colorStyle)}
      delayPressIn={200}
    >
      <View style={[{flexDirection: flexDir, alignItems: "center", justifyContent: "space-between", flex: 1}, textMargin]}>
        <View style={{flexDirection: flexDir, alignItems: "center"}}>
          {
            !!onPressCheckBox ?
            <TouchableOpacity style={{paddingHorizontal: 10, paddingVertical: 15}} onPress={onPressCheckBox} >
              <IndeterminateCheckBox themeStr={themeStr} state={checkBoxSelected} onPress={onPressCheckBox} />
            </TouchableOpacity> : null
          }
          { !isHeb ?
            <Text style={[styles.englishText].concat([theme.tertiaryText, textStyle, {paddingTop:3}])}>
              {`${enText} `}
              {
                !!count ? <Text style={[styles.englishText].concat([theme.secondaryText, textStyle])}>{`(${count})`}</Text> : null
              }
            </Text>
            :
            <Text style={[styles.hebrewText].concat([theme.tertiaryText, textStyle, {paddingTop:13}])}>
              {`${heText} `}
              {
                !!count ? <Text style={[styles.hebrewText].concat([theme.secondaryText, textStyle])}>{`(${count})`}</Text> : null
              }
            </Text>
          }
        </View>
        {
          (hasEn && !isHeb) ? <Text style={[styles.englishSystemFont, styles.enConnectionMarker, theme.enConnectionMarker, theme.secondaryText, Platform.OS === 'android' ? {paddingLeft: 5, paddingTop: 2} : null]}>{"EN"}</Text> : null
        }
      </View>
      { withArrow ?
        <DirectedArrow themeStr={themeStr} imageStyle={{opacity: 0.5}} language={textLanguage} direction={"forward"} />
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

const LanguageToggleButton = () => {
  // button for toggling b/w he and en for menu and text lang (both controlled by `textLanguage`)
  const { themeStr, interfaceLanguage, textLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const dispatch = useContext(DispatchContext);
  const isHeb = Sefaria.util.get_menu_language(interfaceLanguage, textLanguage) == 'hebrew';

  const toggle = () => {
    const language = !isHeb ? "hebrew" : 'english';
    dispatch({
      type: STATE_ACTIONS.setTextLanguage,
      value: language,
    });
  };

  const content = isHeb ?
      (<Text style={[styles.languageToggleTextEn, theme.languageToggleText, styles.en]}>A</Text>) :
      (<Text style={[styles.languageToggleTextHe, theme.languageToggleText, styles.he]}>א</Text>);
  const style = [styles.languageToggle, theme.languageToggle, interfaceLanguage === "hebrew" ? {opacity:0} : null];
  return (
    <TouchableOpacity style={style} onPress={interfaceLanguage === "hebrew" ? null : toggle} accessibilityLabel={`Change language to ${isHeb ? "English" : "Hebrew"}`}>
      {content}
    </TouchableOpacity>
  );
}

const CollapseIcon = ({ showHebrew, isVisible }) => {
  const { themeStr } = useContext(GlobalStateContext);
  let src;
  if (isVisible) {
    src = iconData.get('down', themeStr);
  } else {
    if (showHebrew) {
      src = iconData.get('back', themeStr);
    } else {
      src = iconData.get('forward', themeStr);
    }
  }
  return (
    <Image
      source={src}
      style={[(showHebrew ? styles.collapseArrowHe : styles.collapseArrowEn), Platform.OS === 'android' ? {marginTop: 3} : null]}
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
    direction:  PropTypes.oneOf(["forward", "back"]).isRequired,
    placeholder:PropTypes.bool,
    accessibilityText: PropTypes.string,
  };

  render() {
    //the actual dir the arrow will face
    var actualDirBack = (this.props.language === "hebrew"  && this.props.direction === "forward") || (this.props.language === "english" && this.props.direction === "back")
    return (
      <TouchableOpacity onPress={this.props.onPress}
        style={{ flexDirection: actualDirBack ? "row-reverse" : "row", alignItems: "center", opacity: this.props.placeholder ? 0 : 1 }}
        hitSlop={{top: 20, bottom: 20, left: 10, right: 10}}
        accessibilityLabel={ this.props.accessibilityText || this.props.text || this.props.direction }
      >
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
  const isheb = language === 'hebrew';
  const actualDirBack = (isheb  && direction === "forward") || (!isheb && direction === "back");
  const iconName = actualDirBack ? 'back' : 'forward';
  const src = iconData.get(iconName, themeStr);
  return (
    <Image source={src} style={imageStyle} resizeMode={'contain'}/>
  );
}
DirectedArrow.propTypes = {
  imageStyle:   PropTypes.oneOfType([ViewPropTypes.style, PropTypes.array]),
  language:     PropTypes.oneOf(["hebrew", "bilingual", "english"]).isRequired,
  direction:  PropTypes.oneOf(["forward", "back"]).isRequired,
};

const SearchButton = ({ onPress, extraStyles, disabled }) => {
  const { themeStr } = useContext(GlobalStateContext);
  return (
    <TouchableOpacity style={[styles.headerButton, styles.headerButtonSearch, extraStyles]} onPress={onPress} disabled >
      <Image
        source={iconData.get('search', themeStr)}
        style={styles.searchButton}
        resizeMode={'contain'}
      />
    </TouchableOpacity>
  );
}

const MenuButton = ({ onPress, placeholder }) => {
  const { themeStr } = useGlobalState();
  return (
    <TouchableOpacity style={[styles.headerButton, styles.leftHeaderButton, {opacity: placeholder ? 0 : 1}]} onPress={onPress} accessibilityLabel="Open Menu">
      <Image
        source={iconData.get('menu', themeStr)}
        style={styles.menuButton}
        resizeMode={'contain'}
      />
    </TouchableOpacity>
  );
}

const CloseButton = ({ onPress }) => {
  const { themeStr } = useContext(GlobalStateContext);
  return (
    <TouchableOpacity style={[styles.headerButton, styles.leftHeaderButton]} onPress={onPress} accessibilityLabel="Close">
      <Image
        source={iconData.get('close', themeStr)}
        style={styles.closeButton}
        resizeMode={'contain'}
      />
    </TouchableOpacity>
  );
}

const CircleCloseButton = ({ onPress }) => {
  const { themeStr } = useContext(GlobalStateContext);
  return (
    <TouchableOpacity style={styles.headerButton} onPress={onPress} accessibilityLabel="Close">
      <Image
        source={iconData.get('circle-close', themeStr)}
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
        source={iconData.get('dots', themeStr)}
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
      accessibilityLabel="Open display settings"
    >
      <Image
        source={iconData.get('a-aleph', themeStr)}
        style={styles.displaySettingsButton}
        resizeMode={'contain'}
      />
    </TouchableOpacity>
  );
}

const ToggleSet = ({ options, active }) => {
  const { themeStr, textLanguage, interfaceLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const isHeb = Sefaria.util.get_menu_language(interfaceLanguage, textLanguage) == 'hebrew';
  options = options.map((option, i) => {
    var style = [styles.navToggle, theme.navToggle].concat(active === option.name ? [styles.navToggleActive, theme.navToggleActive] : []);
    return (
      <TouchableOpacity onPress={option.onPress} key={i} >
        {isHeb ?
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
  const { themeStr, interfaceLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  var showHebrew = interfaceLanguage == "hebrew";
  const optionComponents = options.map((option, i) => {

    let alignStyle;
    if (i == options.length -1) { alignStyle = styles.readerDisplayOptionsMenuItemRight; }
    else if (i == 0)            { alignStyle = styles.readerDisplayOptionsMenuItemLeft; }
    else                        { alignStyle = styles.readerDisplayOptionsMenuItemCenter; }

    var itemStyles = [styles.readerDisplayOptionsMenuItem, theme.readerDisplayOptionsMenuItem, alignStyle];
    itemStyles = itemStyles.concat(active === option.name ? [theme.readerDisplayOptionsMenuItemSelected] : []);
    return (
      <TouchableOpacity onPress={option.onPress} key={i} style={itemStyles}>
        {showHebrew ?
          <Text style={[styles.heInt, theme.tertiaryText]}>{option.text}</Text> :
          <Text style={[styles.enInt, theme.tertiaryText]}>{option.text}</Text> }
      </TouchableOpacity>
    );
  });

  return (
    <View style={[styles.readerDisplayOptionsMenuRow, styles.buttonToggleSet]}>
      {optionComponents}
    </View>
  );
}
ButtonToggleSet.propTypes = {
  options:     PropTypes.array.isRequired, // array of object with `name`. `text`, `onPress`
  active:      PropTypes.oneOfType([PropTypes.bool, PropTypes.string])
};

const ButtonToggleSetNew = ({ options, active }) => {
  /* based on new styles guide */
  const { themeStr, interfaceLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const isHeb = interfaceLanguage === 'hebrew';
  return (
    <View style={[styles.readerDisplayOptionsMenuRow, styles.boxShadow, styles.buttonToggleSetNew, theme.mainTextPanel]}>
      {
        options.map(option => {
          const isActive = active === (typeof option.value == 'undefined' ? option.name : option.value);
          return (
            <TouchableOpacity key={option.name} onPress={option.onPress} style={[styles.buttonToggle, isActive ? styles.buttonToggleActive : null]}>
              <Text  style={[theme.text, isActive ? styles.buttonToggleActiveText : null, isHeb? styles.heInt : styles.enInt]}>
                { option.text }
              </Text>
            </TouchableOpacity>
          );
        })
      }
    </View>
  );
}

const LoadingView = ({ style, category, size, height, color=Sefaria.palette.colors.system }) => (
  <View style={[styles.loadingViewBox, style]}>
    <ActivityIndicator
      animating={true}
      style={[styles.loadingView, !!height ? { height } : null]}
      color={Platform.OS === 'android' ? (category ? Sefaria.palette.categoryColor(category) : color) : undefined}
      size={size || 'large'}
    />
  </View>
);

const IndeterminateCheckBox = ({ state, onPress }) => {
  const { themeStr } = useContext(GlobalStateContext);
  let iconName;
  if (state === 1) {
    iconName = 'checkbox-checked';
  } else if (state === 0) {
    iconName = 'checkbox-unchecked';
  } else {
    iconName = 'checkbox-partially';
  }
  const src = iconData.get(iconName, themeStr);

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

const HebrewInEnglishText = ({ text, stylesEn, stylesHe }) => (
  Sefaria.util.hebrewInEnglish(Sefaria.util.stripHtml(text),"list").map((chunk, index) =>
    (Sefaria.hebrew.isHebrew(chunk) ?
      <Text key={index} style={stylesHe}>{chunk}</Text> :
      <Text key={index} style={stylesEn}>{chunk}</Text>
    )
  )
);

class SText extends React.Component {
  static propTypes = {
    children: PropTypes.oneOfType([PropTypes.string, PropTypes.object, PropTypes.array]),
    lang:     PropTypes.oneOf(["hebrew", "bilingual", "english"]),
    style:    PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  }

  getFontSize = (style, lang) => {
    let fsize = 14;  // default font size in rn (i believe)
    for (let s of style) {
      if (!!s && !!s.fontSize) { fsize = s.fontSize; }
    }
    fsize = lang === "hebrew" ? 1.2*fsize : fsize;
    return fsize;
  }

  render() {
    const { style, lang, lineMultiplier, children } = this.props;
    const styleArray = Array.isArray(style) ? style : [style];
    const fontSize = this.getFontSize(styleArray, lang);
    return (
      <Text {...this.props} style={styleArray.concat([{lineHeight: Sefaria.util.fsize2lheight(fontSize, lang, lineMultiplier)}])}>
        { children }
      </Text>
    );
  }
}

const TabRowView = ({ tabs, renderTab, currTabId, setTab, flexDirection='row' }) => {
  const { theme } = useGlobalState();
  const renderTabWrapper = (tab) => {
    const active = currTabId === tab.id;
    return (
      <TouchableOpacity key={tab.id} onPress={() => setTab(tab.id)}>
        {renderTab(tab, active)}
      </TouchableOpacity>
    );
  };
  return (
    <View style={[{ flexDirection, borderBottomWidth: 1, marginHorizontal: -15, paddingHorizontal: 15, alignItems: "flex-end" }, theme.borderedBottom]}>
      {tabs.map(renderTabWrapper)}
    </View>
  );
}

const TabView = ({ active, lang, ...tabTextProps }) => {
  /*
  Standard Sefaria Tab to be used in renderTab of TabRowView
  */
  const { theme } = useGlobalState();
  const activeBorderStyle = [theme.borderBottomDarker];
  const style = {marginRight: lang === 'hebrew' ? 0 : 20, marginLeft: lang === 'hebrew' ? 20 : 0};
  return (
    <View style={[{ paddingVertical: 10, borderBottomWidth: 4, borderBottomColor: "transparent" }, style].concat(active ? activeBorderStyle : [])}>
      <TabText active={active} {...tabTextProps} />
    </View>
  );
};

const TabText = ({ active, text, baseTextStyles, activeTextStyle, inactiveTextStyle }) => {
  const textStyle = baseTextStyles.concat([active ? activeTextStyle : inactiveTextStyle]);
  return (
      <Text style={textStyle}>{ text }</Text>
  );
};

const LocalSearchBar = ({ onChange, query, onFocus }) => {
  /*
  Search bar used for local search on a page. E.g. on topic pages
  */
  const { themeStr, theme } = useGlobalState();
  const placeholderTextColor = themeStr == "black" ? "#BBB" : "#777";
  return (
    <View style={[{borderRadius: 400, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10}, theme.container, theme.lighterGreyBorder]}>
      <SearchButton onPress={()=>{}} extraStyles={{height: 40}} disabled />
      <View style={Platform.OS === 'android' ? {flex: 1, marginTop: 2, marginBottom: -2} : {flex:1}}>
        <TextInput
          style={[styles.en, { fontSize: 18, paddingVertical: 0, paddingRight: 20, lineHeight: Platform.OS === 'android' ? 40 : null, flex: 1 }, theme.text]}
          onChangeText={onChange}
          value={query}
          underlineColorAndroid={"transparent"}
          placeholder={strings.search}
          placeholderTextColor={placeholderTextColor}
          autoCorrect={false}
          onFocus={onFocus}
        />
      </View>
      {query ?
        <CancelButton onPress={() => { onChange(""); }} extraStyles={[{marginHorizontal: 5}]}/>
        : null
      }
    </View>

  );
};

const CancelButton = ({ onPress, extraStyles=[] }) => {
  const { themeStr } = useGlobalState();
  return (
    <TouchableOpacity onPress={onPress} accessibilityLabel="close">
      <Image
        source={iconData.get('close', themeStr)}
        style={[styles.cancelSearchButton].concat(extraStyles)}
        resizeMode={'contain'}
      />
    </TouchableOpacity>
  );
}

const SaveButton = ({ historyItem, showToast, extraStyles=[] }) => {
  const { themeStr, interfaceLanguage, textLanguage } = useContext(GlobalStateContext);
  const [, forceUpdate] = useReducer(x => x + 1, 0);  // HACK
  const isHeb = Sefaria.util.get_menu_language(interfaceLanguage, textLanguage) == "hebrew";
  const isSaved = Sefaria.history.indexOfSaved(historyItem.ref) !== -1;
  const iconName = isSaved ? 'starFilled' : 'starUnfilled';
  const src = iconData.get(iconName, themeStr);
  return (
    <TouchableOpacity onPress={
        () => {
          const willBeSaved = !isSaved;
          const newHistoryItem = {...historyItem, saved: willBeSaved};
          Sefaria.history.saveSavedItem(
            newHistoryItem,
            willBeSaved ? 'add_saved' : 'delete_saved'
          );
          const { is_sheet, sheet_title, ref, he_ref } = newHistoryItem;
          const title = is_sheet ? Sefaria.util.stripHtml(sheet_title || '') : (isHeb ? he_ref : ref);
          showToast(`${willBeSaved ? strings.saved2 : strings.removed} ${title}`);
          forceUpdate();
        }
      }>
      <Image
        style={[styles.starIcon].concat(extraStyles)}
        source={src}
        resizeMode={'contain'}
      />
    </TouchableOpacity>
  );
}

const SimpleInterfaceBlock = ({en, he, extraStyles}) => {
  const { themeStr, interfaceLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const isHeb = interfaceLanguage == 'hebrew';
  const fullStyle = [isHeb ? styles.heInt : styles.enInt, theme.text].concat(extraStyles);
  return (
    <View>
      <Text style={fullStyle}>{isHeb ? he : en}</Text>
    </View>
  );
}
SimpleInterfaceBlock.propTypes = {
  en: PropTypes.string,
  he: PropTypes.string,
  extraStyles: PropTypes.array,
};

const SimpleHTMLView = ({text, lang, extraStyles=[], onPressATag, ...renderHTMLProps}) => {
  const { themeStr } = useContext(GlobalStateContext);
  const { width } = useWindowDimensions();
  const { textStyle, classesStyles, tagsStyles } = useHTMLViewStyles(false, lang);
  const renderersProps = useRenderersProps(onPressATag);
  const theme = getTheme(themeStr);
  const html = Sefaria.util.getDisplayableHTML(text, lang);
  textStyle.style.concat(extraStyles);
  return (
    <RenderHTML
      source={{ html }}
      contentWidth={width}
      defaultTextProps={textStyle}
      classesStyles={classesStyles}
      tagsStyles={tagsStyles}
      systemFonts={SYSTEM_FONTS}
      renderersProps={renderersProps}
      dangerouslyDisableWhitespaceCollapsing
      {...renderHTMLProps}
    />
  );
}
SimpleHTMLView.propTypes = {
  text: PropTypes.string.isRequired,
  lang: PropTypes.oneOf(['english', 'hebrew']),
};

const SimpleContentBlock = ({en, he, classes}) => {
  const { themeStr, interfaceLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const showHebrew = !!he;
  const showEnglish = !!en && interfaceLanguage == 'english';
  return (
    <View>
      {showHebrew  ? <SimpleHTMLView text={he} lang={'hebrew'} />: null}
      {showEnglish ? <SimpleHTMLView text={en} lang={'english'} /> : null}
    </View>
  );
}
SimpleContentBlock.propTypes = {
  en: PropTypes.string,
  he: PropTypes.string,
  classes: PropTypes.string
};


const SimpleLinkedBlock = ({en, he, children, onClick, extraStyles}) => {
  const { themeStr, interfaceLanguage } = useContext(GlobalStateContext);
  const theme = getTheme(themeStr);
  const isHeb = interfaceLanguage == 'hebrew';
  const fullStyle = [isHeb ? styles.heInt : styles.enInt, theme.text].concat(extraStyles);
  return (
    <View>
      <TouchableOpacity onPress={onClick}>
        <SText style={fullStyle} lang={interfaceLanguage} lineMultiplier={1.05}>{isHeb ? he : en}</SText>
      </TouchableOpacity>
      {children}
    </View>
  );
}
SimpleLinkedBlock.propTypes = {
  en: PropTypes.string,
  he: PropTypes.string,
  extraStyles: PropTypes.array,
  onClick: PropTypes.func,
};

const ProfileListing = ({ image, name, organization, flexDirection='row' }) => {
  const { themeStr } = useContext(GlobalStateContext);
  return (
    <View style={{flexDirection}}>
      <ProfilePic
        len={40}
        url={image}
        name={name}
        themeStr={themeStr}
      />
      <View style={{paddingHorizontal: 10, justifyContent: 'space-between', flex: 1}}>
        <SimpleInterfaceBlock
          en={name}
          he={name}
        />
        {
          !!organization ? <SimpleInterfaceBlock
            en={organization}
            he={organization}
          />:null
        }
      </View>
    </View>
  );
};
ProfileListing.propTypes = {
  image:       PropTypes.string.isRequired,
  name:        PropTypes.string.isRequired,
};

/* flexible profile picture that overrides the default image of gravatar with text with the user's initials */
class ProfilePic extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showDefault: !props.url || props.url.startsWith("https://www.gravatar"), // We can't know in advance if a gravatar image exists of not, so start with the default beforing trying to load image
      url: props.url.replace("profile-default.png", 'profile-default-404.png'),
    };
    this.imgFile = React.createRef();
  }
  componentDidMount() {
    this._isMounted = true;
    Image.prefetch(this.state.url).then(this.setShowImage).catch(()=>{});
    if (this.didImageLoad()) {
      this.setShowImage();
    } else {
      this.setShowDefault();
    }
  }
  componentWillUnmount() { this._isMounted = false; }
  setShowDefault = () => {
    console.log('setShowDefault', this._isMounted);
    if (!this._isMounted) { return; }
    this.setState({showDefault: true});
  };
  setShowImage = () => {
    console.log('setShowImage', this._isMounted);
    if (!this._isMounted) { return; }
    this.setState({showDefault: false});
  };
  didImageLoad = () => {
    // When using React Hydrate, the onLoad event of the profile image will return before
    // react code runs, so we check after mount as well to look replace bad images, or to
    // swap in a gravatar image that we now know is valid.
    const img = this.imgFile.current;
    return (img && img.complete && img.naturalWidth !== 0);
  };
  render() {
    const { name, url, len, hideOnDefault, themeStr } = this.props;
    const { showDefault } = this.state;
    const theme = getTheme(themeStr);
    const nameArray = !!name.trim() ? name.trim().split(/\s/) : [];
    const initials = nameArray.length > 0 ? (nameArray.length === 1 ? nameArray[0][0] : nameArray[0][0] + nameArray[nameArray.length-1][0]) : "";
    const imageSrc = url.replace("profile-default.png", 'profile-default-404.png');  // replace default with non-existant image to force onLoad to fail
    console.log('imageSrc', imageSrc);
    return (
      <View>
        {
          showDefault ? (
            <View style={[{width: len, height: len}, styles.profilePic, theme.secondaryBackground]}>
              <Text style={[{fontSize: len/2}, theme.contrastText]}>{`${initials}` }</Text>
            </View>
          ) : (
            <Image
              style={[{width: len, height: len}, styles.profilePic]}
              source={{'uri': imageSrc}}
              ref={this.imgFile}
              onLoad={this.setShowImage}
              onError={this.setShowDefault}
            />
          )
        }
      </View>
    );
  }
}
ProfilePic.propTypes = {
  url:     PropTypes.string,
  name:    PropTypes.string,
  len:     PropTypes.number,
  hideOnDefault: PropTypes.bool,  // hide profile pic if you have are displaying default pic
  showButtons: PropTypes.bool,  // show profile pic action buttons
};

const DataSourceLine = ({ children, dataSources, title, flexDirection="row", prefixText, imageStyles=[] }) => {
  const { themeStr, interfaceLanguage } = useContext(GlobalStateContext);
  const [displaySource, setDisplaySource] = useState(false);
  const theme = getTheme(themeStr);
  const isHeb = interfaceLanguage == 'hebrew';
  let dataSourceText = '';
  const langKey = isHeb ? 'he' : 'en';
  if (!!dataSources && Object.values(dataSources).length > 0) {
    dataSourceText = `${prefixText}"${title && title[langKey]}" ${strings.by} ${Object.values(dataSources).map(d => d[langKey]).join(' & ')}.`;
  }
  return (
    <View>
      <View style={[styles.saveLine, {flexDirection}]}>
        {children}
        <SefariaPressable extraStyles={[styles.dataSourceButton, theme.lighterGreyBackground].concat(imageStyles)} onPress={()=>setDisplaySource(prev=>!prev)}>
          <Image
            source={iconData.get('dots', themeStr)}
            style={styles.dataSourceButtonImage}
            resizeMode={'contain'}
          />
        </SefariaPressable>
      </View>
      { displaySource ? (
        <Text style={[styles.dataSourceText, isHeb ? styles.heInt : styles.enInt, theme.tertiaryText, theme.lighterGreyBackground]}>
          {dataSourceText}
        </Text>
      ) : null}
    </View>
  );
};

const FilterableFlatList = React.forwardRef(({ currFilter, filterFunc, sortFunc, data, spliceIndex, ...flatListProps }, ref) => {
  const [dataToDisplay, setDataToDisplay] = useState(data);
  useEffect(() => {
    if (!data) { setDataToDisplay(data); return; }
    const newDataToDisplay = data.filter(item => filterFunc(currFilter, item)).sort(sortFunc);
    if (spliceIndex !== undefined) {
      newDataToDisplay.splice(spliceIndex, 0, {isSplice: true});
    }
    setDataToDisplay(newDataToDisplay);
  }, [data, currFilter]);
  return (
    <FlatList
      ref={ref}
      data={dataToDisplay}
      {...flatListProps}
    />
  );
});

const SefariaPressable = ({ children, extraStyles=[], ...pressableProps }) => {
  const stylesFunc = useCallback(({ pressed }) => {
    let styles = Array.isArray(extraStyles) ? extraStyles : [extraStyles];
    if (pressed && Platform.OS === 'ios') {
      styles = styles.concat([{opacity: 0.2}]);
    }
    return styles;
  }, [extraStyles]);
  return (
    <Pressable
      style={stylesFunc}
      android_ripple={{color: "#ccc"}}
      {...pressableProps}
    >
      { children }
    </Pressable>
  );
}

export {
  AnimatedRow,
  ButtonToggleSet,
  ButtonToggleSetNew,
  CancelButton,
  CategoryBlockLink,
  CategoryAttribution,
  CategoryColorLine,
  CategorySideColorLink,
  CircleCloseButton,
  CloseButton,
  CollapseIcon,
  ConditionalProgressWrapper,
  ContentTextWithFallback,
  CSS_CLASS_STYLES,
  DataSourceLine,
  DirectedArrow,
  DirectedButton,
  DisplaySettingsButton,
  DotSeparatedList,
  FilterableFlatList,
  HebrewInEnglishText,
  IndeterminateCheckBox,
  InterfaceTextWithFallback,
  LanguageToggleButton,
  LibraryNavButton,
  LoadingView,
  LocalSearchBar,
  MenuButton,
  OrderedList,
  ProfileListing,
  ProfilePic,
  RainbowBar,
  SaveButton,
  SearchButton,
  SefariaPressable,
  SefariaProgressBar,
  SimpleContentBlock,
  SimpleHTMLView,
  SimpleInterfaceBlock,
  SimpleLinkedBlock,
  SText,
  SystemButton,
  SystemHeader,
  SYSTEM_FONTS,
  TabRowView,
  TabView,
  ToggleSet,
  TripleDots,
  TwoBox,
  TwoBoxRow,
}
