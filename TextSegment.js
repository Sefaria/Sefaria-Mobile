'use strict';

import PropTypes from 'prop-types';

import React, { useState, useEffect, useContext, Fragment, useCallback } from 'react';
import {
  Animated,
  Pressable,
  Platform,
  Share,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import ActionSheet from 'react-native-action-sheet';
import HTMLView from 'react-native-htmlview'; //to convert html'afied JSON to something react can render (https://github.com/jsdf/react-native-htmlview)
import { SelectableText } from "@astrocoders/react-native-selectable-text";
import Clipboard from "@react-native-community/clipboard";
import strings from './LocalizedStrings';
import { GlobalStateContext, getTheme } from './StateManager';
import styles from './Styles.js';

const getHTMLViewStyles = (isStacked, bilingual, textType, fontSize, theme, fontScale) => {
  const isHeb = textType == "hebrew";
  const lineHeightMultiplier = isHeb ? (Platform.OS === 'android' ? 1.333 : 1.2) : 1.04;
  const fontSizeMultiplier = isHeb ? 1 : 0.8;
  const justifyStyle = {textAlign: (isStacked && Platform.OS === 'ios') ? 'justify' : (textType === 'hebrew' ? 'right' : 'left')};
  const lineHeight = fontScale ? Animated.multiply(fontSize * lineHeightMultiplier, fontScale) : (fontSize * lineHeightMultiplier);
  const fontSizeScaled = fontScale ? Animated.multiply(fontSize*fontSizeMultiplier, fontScale) : fontSize*fontSizeMultiplier;
  const textStyle = [
    isHeb ? styles.hebrewText : styles.englishText,
    theme.text,
    justifyStyle,
    {
      lineHeight,
      fontSize: fontSizeScaled,
    },
  ];
  if (bilingual && textType == "english") {
    if (isStacked) {
      textStyle.push(styles.bilingualEnglishText);
    }
    textStyle.push(theme.bilingualEnglishText);
  }
  const styleSheetMods = {
    small: {
      fontSize: fontSize * 0.8 * (textType === "hebrew" ? 1 : 0.8)
    },
    hediv: {
      ...styles.hediv,
      ...justifyStyle,
    },
    endiv: {
      ...styles.endiv,
      ...justifyStyle,
    }
  };

  const htmlStyleSheet = {...styles, ...styleSheetMods};
  return {
    htmlStyleSheet,
    textStyle,
  }
};

// pass correct functions to TextSegment for sheet renderers. probably combine renderers and make it simpler
const TextSegment = React.memo(({
  segmentRef,
  segmentKey,
  data,
  textType,
  bilingual,
  fontScale,
  setDictionaryLookup,
  showToast,
  openUriOrRef,
  onTextPress,
  shareCurrentSegment,
  getDisplayedText,
}) => {
  const [resetKey, setResetKey] = useState(0);
  const { themeStr, fontSize, biLayout } = useContext(GlobalStateContext);
  useEffect(() => {
    setResetKey(resetKey+1);  // hacky fix to reset htmlview when theme colors change
    return () => {};
  }, [themeStr, fontSize]);
  const theme = getTheme(themeStr);
  const getTextWithUrl = useCallback((text, withUrl) => {
    return withUrl ? `${text}\n\n${Sefaria.refToFullUrl(segmentRef)}` : text;
  }, [segmentRef]);
  const shareText = useCallback((text) => {
    Share.share({
      message: getTextWithUrl(text, Platform.OS === 'android'),  // android for some reason doesn't share text with a url attached at the bottom
      title: segmentRef,
      url: Sefaria.refToFullUrl(segmentRef)
    })
  }, [segmentRef]);
  const copyToClipboard = useCallback((text) => {
    Clipboard.setString(text);
    showToast("Copied to clipboard");
  }, []);
  const onSelection = useCallback(({ eventType, content }) => {
    if (eventType == 'Copy') { copyToClipboard(content); }
    else if (eventType == 'Share') { shareText(content); }
    else { onTextPress(true); setDictionaryLookup({ dictLookup: content }); }
  }, [shareText]);
  const isStacked = biLayout === 'stacked';
  const { textStyle, htmlStyleSheet } = getHTMLViewStyles(isStacked, bilingual, textType, fontSize, theme, fontScale);
  let menuItems = ['Copy', 'Define', 'Share'];
  if (textType === 'english') {
    menuItems.splice(1, 1);
  }

  const onLongPress = useCallback(() => {
    if (Platform.OS === 'ios') { return; /* no actionsheet for ios, this is handled by text selection */ }
    ActionSheet.showActionSheetWithOptions({
      options: [
        strings.copy,
        strings.share,
        strings.cancel,
      ],
      cancelButtonIndex: 2,
    },
    (buttonIndex) => {
      const section = parseInt(segmentKey.split(":")[0]);
      const segment = parseInt(segmentKey.split(":")[1]);
      if (buttonIndex === 0) { copyToClipboard(getDisplayedText(true, section, segment, segmentRef)); }
      else if (buttonIndex === 1) { shareCurrentSegment(section, segment, segmentRef); }
    })
  }, [segmentRef]);
  const onPress = useCallback(() => onTextPress(), [onTextPress]);

  const TempSelectableText = Platform.OS === 'ios' ? SelectableText : DummySelectableText;
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayPressIn={200}
    >
      <TempSelectableText
        menuItems={menuItems}
        onSelection={onSelection}
        value={data}
        textValueProp={'value'}
        TextComponent={HTMLView}
        textComponentProps={{
          stylesheet: htmlStyleSheet,
          RootComponent: Text,
          TextComponent: Animated.Text,
          onLinkPress: openUriOrRef,
          textComponentProps: {
            suppressHighlighting: false,
            key: segmentKey,
            style: textStyle,
          },
        }}
      />
    </TouchableOpacity>
  );
});
TextSegment.whyDidYouRender = {customName: 'TextSegment'};
TextSegment.propTypes = {
  segmentRef:         PropTypes.string.isRequired, /* this ref keys into TextColumn.rowRefs */
  segmentKey:         PropTypes.string,
  data:               PropTypes.string,
  textType:           PropTypes.oneOf(["english","hebrew"]),
  bilingual:          PropTypes.bool,
  onTextPress:        PropTypes.func.isRequired,
  showToast:          PropTypes.func.isRequired,
  fontScale:          PropTypes.object,
};

const DummySelectableText = ({ value, TextComponent, textComponentProps, ...props }) => {
  textComponentProps.value = value;
  return (
    <TextComponent
      { ...textComponentProps}
    />
);}
export default TextSegment;
