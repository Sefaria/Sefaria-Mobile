'use strict';

import PropTypes from 'prop-types';

import React, { useState, useEffect, useContext, Fragment, useCallback } from 'react';
import {
  Platform,
  Share,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import ActionSheet from 'react-native-action-sheet';
import RenderHtml, { RenderHTML } from 'react-native-render-html';
import { SelectableText } from "@astrocoders/react-native-selectable-text";
import Clipboard from "@react-native-community/clipboard";
import strings from './LocalizedStrings';
import { GlobalStateContext, getTheme } from './StateManager';
import styles from './Styles.js';

const cssClassStyles = {
  hebrew: {
    fontFamily: "Taamey Frank Taamim Fix",
    writingDirection: "rtl",
    flex: -1,
    paddingTop: 15,
    marginTop: -10,
    textAlign: Platform.OS == "android" ? "right" : "justify",
  },
  english: {
    fontFamily: "Amiri",
    fontWeight: "normal",
    textAlign: 'justify',
    paddingTop: 15,
    marginTop: -10,
  },
};

const getHTMLViewStyles = (isStacked, bilingual, textType, fontSize, theme) => {
  const isHeb = textType == "hebrew";
  const lineHeightMultiplier = isHeb ? (Platform.OS === 'android' ? 1.333 : 1.2) : 1.15;
  const fontSizeMultiplier = isHeb ? 1 : 0.8;
  const justifyStyle = {textAlign: (isStacked && Platform.OS === 'ios') ? 'justify' : (textType === 'hebrew' ? 'right' : 'left')};
  const lineHeight = fontSize * lineHeightMultiplier;
  const fontSizeScaled = fontSize * fontSizeMultiplier;
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
  const tempClassStyles = {
    small: {
      fontSize: fontSize * 0.8 * (textType === "hebrew" ? 1 : 0.8)
    },
    hebrew: {
      ...cssClassStyles.hebrew,
      ...justifyStyle,
    },
    english: {
      ...cssClassStyles.english,
      ...justifyStyle,
    }
  };

  return {
    tempClassStyles,
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
  setDictionaryLookup,
  showToast,
  handleOpenURL,
  onTextPress,
  shareCurrentSegment,
  getDisplayedText,
}) => {
  const [resetKey, setResetKey] = useState(0);
  const { themeStr, fontSize, biLayout } = useContext(GlobalStateContext);
  const { width } = useWindowDimensions();
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
  const { textStyle, tempClassStyles } = getHTMLViewStyles(isStacked, bilingual, textType, fontSize, theme);
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
      <RenderHTML
        source={{html: data}}
        contentWidth={width}
        defaultTextProps={{style: textStyle}}
        classesStyles={tempClassStyles}
        systemFonts={["Taamey Frank Taamim Fix", "Amiri"]}
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
};

const DummySelectableText = ({ value, TextComponent, textComponentProps, ...props }) => {
  textComponentProps.value = value;
  return (
    <TextComponent
      { ...textComponentProps}
    />
);}
export default TextSegment;

/*
{
          stylesheet: htmlStyleSheet,
          RootComponent: Text,
          TextComponent: Text,
          onLinkPress: handleOpenURL,
          textComponentProps: {
            suppressHighlighting: false,
            key: segmentKey,
            style: textStyle,
          },
        }
*/
