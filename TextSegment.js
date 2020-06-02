'use strict';

import PropTypes from 'prop-types';

import React, { useState, useEffect, useContext, Fragment } from 'react';
import {
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import HTMLView from 'react-native-htmlview'; //to convert html'afied JSON to something react can render (https://github.com/jsdf/react-native-htmlview)
import { SelectableText } from "@astrocoders/react-native-selectable-text";
import { GlobalStateContext, getTheme } from './StateManager';
import styles from './Styles.js';

const TextSegment = React.memo(({
  rowRef,
  segmentKey,
  data,
  textType,
  bilingual,
  textSegmentPressed,
  copyToClipboard,
  shareText,
  fontScale,
  setDictionaryLookup,
}) => {
  const [resetKey, setResetKey] = useState(0);
  const { themeStr, fontSize, biLayout } = useContext(GlobalStateContext);
  useEffect(() => {
    setResetKey(resetKey+1);  // hacky fix to reset htmlview when theme colors change
    return () => {};
  }, [themeStr, fontSize]);
  const theme = getTheme(themeStr);
  const onPress = (onlyOpen) => {
    let key = segmentKey;
    let section = parseInt(key.split(":")[0]);
    let segment = parseInt(key.split(":")[1]);
    textSegmentPressed(section, segment, rowRef, onlyOpen);
  };

  const isStacked = biLayout === 'stacked';
  const lineHeightMultiplierHe = Platform.OS === 'android' ? 1.3 : 1.2;
  const justifyStyle = {textAlign: (isStacked && Platform.OS === 'ios') ? 'justify' : (textType === 'hebrew' ? 'right' : 'left')};
  const style = textType == "hebrew" ?
                [styles.hebrewText, theme.text, justifyStyle, {lineHeight: Animated.multiply(fontSize * lineHeightMultiplierHe, fontScale), fontSize: Animated.multiply(fontSize, fontScale)}] :
                [styles.englishText, theme.text, justifyStyle, {fontSize: Animated.multiply(0.8*fontSize, fontScale), lineHeight: Animated.multiply(fontSize * 1.04, fontScale) }];
  if (bilingual && textType == "english") {
    if (isStacked) {
      style.push(styles.bilingualEnglishText);
    }
    style.push(theme.bilingualEnglishText);
  }
  const smallSheet = {
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
  return (
    <TouchableOpacity
      hitSlop= {{top: 10, bottom: 10, left: 10, right: 10}}
      onPress={() => onPress()}
      onLongPress={() => {}}
      delayLongPress={200}
      delayPressIn={200}
      style={{flex: textType == "hebrew" ? 4.5 : 5.5, paddingHorizontal: 10}}
    >
      <SelectableText
        menuItems={['Copy', 'Define', 'Share']}
        onSelection={({ eventType, content, selectionStart, selectionEnd }) => {
          if (eventType == 'Copy') { copyToClipboard(content); }
          else if (eventType == 'Share') { shareText(content); }
          else { onPress(true); setDictionaryLookup({ dictLookup: content }); }
        }}
        value={data}
        textValueProp={'value'}
        TextComponent={HTMLView}
        textComponentProps={{
          stylesheet: {...styles, ...smallSheet},
          RootComponent: React.Fragment,
          style: undefined,
          TextComponent: Animated.Text,
          textComponentProps: {
            suppressHighlighting: false,
            key: segmentKey,
            style: style,
          },
        }}
      />
    </TouchableOpacity>
  );
});
TextSegment.whyDidYouRender = true;
TextSegment.propTypes = {
  rowRef:             PropTypes.string.isRequired, /* this ref keys into TextColumn.rowRefs */
  segmentKey:         PropTypes.string,
  data:               PropTypes.string,
  textType:           PropTypes.oneOf(["english","hebrew"]),
  bilingual:          PropTypes.bool,
  textSegmentPressed: PropTypes.func.isRequired,
  copyToClipboard:    PropTypes.func.isRequired,
  shareText:          PropTypes.func.isRequired,
  fontScale:          PropTypes.object,
};


export default TextSegment;
