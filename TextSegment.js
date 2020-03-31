'use strict';

import PropTypes from 'prop-types';

import React, { useState, useEffect, useContext } from 'react';
import {
  Animated,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Alert,
} from 'react-native';
import SelectableTextView from './NativeModules/SelectableTextView';
import { GlobalStateContext, getTheme } from './StateManager';
import styles from './Styles.js';
import iPad from './isIPad';


const TextSegment = React.memo(({
  rowRef,
  segmentKey,
  data,
  textType,
  bilingual,
  textSegmentPressed,
  onLongPress,
  fontScale,
}) => {
  const [resetKey, setResetKey] = useState(0);
  const { themeStr, fontSize, biLayout } = useContext(GlobalStateContext);
  useEffect(() => {
    setResetKey(resetKey+1);  // hacky fix to reset htmlview when theme colors change
    return () => {};
  }, [themeStr, fontSize]);
  const theme = getTheme(themeStr);
  const onPress = () => {
    let key = segmentKey;
    let section = parseInt(key.split(":")[0]);
    let segment = parseInt(key.split(":")[1]);
    textSegmentPressed(section, segment, rowRef, true);
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

  /*
  <HTMLView
    key={resetKey}
    value={data}
    stylesheet={{...styles, ...smallSheet}}
    rootComponentProps={{
        hitSlop: {top: 10, bottom: 10, left: 10, right: 10},  // increase hit area of segments
        onPress,
        onLongPress,
        delayPressIn: 200,
      }
    }
    RootComponent={TouchableOpacity}
    TextComponent={Animated.Text}
    textComponentProps={
      {
        suppressHighlighting: false,
        key: segmentKey,
        style: style,

      }
    }
    style={{flex: textType == "hebrew" ? 4.5 : 5.5, paddingHorizontal: 10}}
  />
  */
  const yostyle = (textType == 'hebrew') ? [styles.hebrewText] : [styles.englishText, styles.bilingualEnglishText];
  yostyle.push({

  })
  return (
    <TouchableOpacity
      hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
      onPress={onPress}
      delayPressIn={200}
    >
      <SelectableTextView
        style={{
          height: 50,
          color: "#666"
        }}
        menuItems={["Thing", "Stuff"]}
        font={textType == 'hebrew' ? "Taamey Frank Taamim Fix" : "Amiri"}
        onSelection={({eventType, content, selectionStart, selectionEnd}) => {
          Alert.alert(`Event: ${eventType}`, `Selection: ${content}`);
        }}
        text={data}
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
  onLongPress:        PropTypes.func.isRequired,
  fontScale:          PropTypes.object,
};


export default TextSegment;
